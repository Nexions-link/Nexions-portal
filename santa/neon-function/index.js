import pg from 'pg';
import crypto from 'node:crypto';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const random = (n = 24) => crypto.randomBytes(n).toString('base64url');
const hash = (password, salt) => crypto.scryptSync(password, salt, 64);
const base = '/santa/api';
const cors = {
  'Access-Control-Allow-Origin': 'https://nexions.ru',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '600',
  'Cache-Control': 'no-store',
  'Vary': 'Origin'
};
const respond = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
});
const fail = (status, error) => respond({ error }, status);
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

async function organizer(request, roomId) {
  const { rows } = await pool.query('SELECT * FROM santa_rooms WHERE id=$1', [roomId]);
  const room = rows[0];
  if (!room) return { status: 404, error: 'Комната не найдена' };
  let password = '';
  try {
    const authorization = request.headers.get('authorization') || '';
    if (authorization.startsWith('Basic ')) {
      const decoded = Buffer.from(authorization.substring(6), 'base64').toString('utf8');
      if (decoded.startsWith('admin:')) password = decoded.slice(6);
    }
  } catch {}
  const actual = hash(password, room.salt);
  const expected = Buffer.from(room.password_hash, 'hex');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return { status: 401, error: 'Неверный пароль' };
  }
  return { room };
}

export default async function fetchHandler(request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith(base)) return fail(404, 'Не найдено');

  try {
    if (request.method === 'GET' && path === base + '/health') {
      const { rows } = await pool.query('SELECT 1 AS ok');
      return respond({ ok: rows[0]?.ok === 1, database: 'connected' });
    }

    if (request.method === 'POST' && path === base + '/rooms') {
      const { title, budget, eventDate, password } = await request.json();
      if (typeof title !== 'string' || !title.trim() || title.length > 80
        || !Number.isSafeInteger(Number(budget)) || Number(budget) < 0 || Number(budget) > 1000000
        || !isDate(eventDate) || typeof password !== 'string' || password.length < 10 || password.length > 256) {
        return fail(400, 'Проверь параметры игры');
      }
      const room = random(7), salt = random(16);
      await pool.query(
        'INSERT INTO santa_rooms(id,title,budget,event_date,password_hash,salt) VALUES($1,$2,$3,$4,$5,$6)',
        [room, title.trim(), Number(budget), eventDate, hash(password, salt).toString('hex'), salt]
      );
      return respond({ room }, 201);
    }

    const join = path.match(/^\/santa\/api\/rooms\/([^/]+)\/join$/);
    if (request.method === 'POST' && join) {
      const roomId = decodeURIComponent(join[1]);
      const { name, wishes = '' } = await request.json();
      if (typeof name !== 'string' || !name.trim() || name.length > 60
        || typeof wishes !== 'string' || wishes.length > 1000) {
        return fail(400, 'Проверь имя и пожелания');
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query('SELECT drawn FROM santa_rooms WHERE id=$1 FOR UPDATE', [roomId]);
        if (!rows[0]) { await client.query('ROLLBACK'); return fail(404, 'Комната не найдена'); }
        if (rows[0].drawn) { await client.query('ROLLBACK'); return fail(409, 'Регистрация завершена'); }
        const ticket = random();
        await client.query(
          'INSERT INTO santa_participants(room_id,name,wishes,ticket) VALUES($1,$2,$3,$4)',
          [roomId, name.trim(), wishes, ticket]
        );
        await client.query('COMMIT');
        return respond({ ticket }, 201);
      } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') return fail(409, 'Это имя уже занято в комнате');
        throw error;
      } finally { client.release(); }
    }

    const ticket = path.match(/^\/santa\/api\/tickets\/([^/]+)$/);
    if (request.method === 'GET' && ticket) {
      const { rows } = await pool.query(
        'SELECT p.*,r.title,r.budget FROM santa_participants p JOIN santa_rooms r ON r.id=p.room_id WHERE p.ticket=$1',
        [decodeURIComponent(ticket[1])]
      );
      const participant = rows[0];
      if (!participant) return fail(404, 'Карточка не найдена');
      let recipient = null;
      if (participant.recipient_id) {
        const result = await pool.query('SELECT name,wishes FROM santa_participants WHERE id=$1 AND room_id=$2',
          [participant.recipient_id, participant.room_id]);
        recipient = result.rows[0] || null;
      }
      return respond({ name: participant.name, title: participant.title, budget: participant.budget, recipient });
    }

    const admin = path.match(/^\/santa\/api\/rooms\/([^/]+)\/(admin|draw)$/);
    if (admin && ((request.method === 'GET' && admin[2] === 'admin')
      || (request.method === 'POST' && admin[2] === 'draw'))) {
      const roomId = decodeURIComponent(admin[1]);
      const auth = await organizer(request, roomId);
      if (auth.error) return fail(auth.status, auth.error);
      if (admin[2] === 'admin') {
        const { rows } = await pool.query(
          'SELECT name FROM santa_participants WHERE room_id=$1 ORDER BY id', [roomId]
        );
        return respond({ title: auth.room.title, drawn: auth.room.drawn, participants: rows });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: [room] } = await client.query('SELECT drawn FROM santa_rooms WHERE id=$1 FOR UPDATE', [roomId]);
        if (room.drawn) { await client.query('ROLLBACK'); return fail(409, 'Жеребьёвка уже проведена'); }
        const { rows: participants } = await client.query(
          'SELECT id FROM santa_participants WHERE room_id=$1 ORDER BY id', [roomId]
        );
        if (participants.length < 3) {
          await client.query('ROLLBACK');
          return fail(400, 'Нужно минимум три участника');
        }
        for (let i = participants.length - 1; i > 0; i--) {
          const j = crypto.randomInt(i + 1);
          [participants[i], participants[j]] = [participants[j], participants[i]];
        }
        for (let i = 0; i < participants.length; i++) {
          await client.query('UPDATE santa_participants SET recipient_id=$1 WHERE id=$2',
            [participants[(i + 1) % participants.length].id, participants[i].id]);
        }
        await client.query('UPDATE santa_rooms SET drawn=true WHERE id=$1', [roomId]);
        await client.query('COMMIT');
        return respond({ ok: true });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }

    return fail(404, 'Не найдено');
  } catch (error) {
    console.error('Santa API error:', error.message);
    return fail(500, 'Ошибка сервера');
  }
}
