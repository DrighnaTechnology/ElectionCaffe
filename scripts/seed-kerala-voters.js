const { Client } = require('pg');

const client = new Client({ host: 'localhost', port: 5333, user: 'postgres', password: 'postgres', database: 'EC_nitish' });

const FIRST_NAMES_M = ['Rajesh','Suresh','Anil','Vijay','Ravi','Mohan','Ajith','Pradeep','Santhosh','Manoj','Babu','Sreekumar','Anoop','Jayan','Vinod','Prasad','Satheesh','Biju','Dileep','Harikumar','Jayakumar','Gopakumar','Sajan','Thomas','Mathew','Joseph','Antony','Sebastian','George','John','Abraham','Shaji','Murali','Deepu','Nishanth','Arun','Vivek','Rahul','Kiran','Akhil'];
const FIRST_NAMES_F = ['Lakshmi','Sunitha','Rani','Priya','Deepa','Anjali','Sreelatha','Beena','Bindu','Reshma','Kavitha','Jaya','Mini','Suja','Latha','Geetha','Remya','Divya','Nisha','Asha','Mary','Tessy','Lissy','Mercy','Grace','Rosa','Thresia','Annamma','Elsamma','Sarala','Usha','Meera','Athira','Ammu','Devika'];
const LAST_NAMES = ['Nair','Menon','Pillai','Kumar','Varma','Krishnan','Unnikrishnan','Rajan','Gopalan','Chandran','Mohan','Das','Panicker','Kurup','Warrier','Iyer','Namboothiri','Pothan','Cherian','Philip','Mathew','Thomas','John','Joseph','Abraham','Kurian','Varghese','George','Sebastian','Xavier'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomMobile() { return String(pick([6,7,8,9])) + String(rand(100000000, 999999999)); }
function randomEpic() {
  const l = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return l[rand(0,25)] + l[rand(0,25)] + l[rand(0,25)] + String(rand(1000000, 9999999));
}

async function run() {
  await client.connect();

  // Get election
  const elRes = await client.query('SELECT id FROM elections LIMIT 1');
  const electionId = elRes.rows[0].id;
  console.log('Election:', electionId);

  // Get all parts
  const partsRes = await client.query('SELECT id, part_number FROM parts WHERE election_id = $1 ORDER BY part_number', [electionId]);
  const parts = partsRes.rows;
  console.log('Parts:', parts.length);

  // Clear existing voters
  await client.query('DELETE FROM voters WHERE election_id = $1', [electionId]);
  console.log('Cleared old voters');

  let totalInserted = 0;

  // Use a prepared statement for single-row inserts (much faster than ad-hoc)
  const INSERT_SQL = `INSERT INTO voters (id, election_id, part_id, name, gender, age, epic_number, mobile, sl_number, created_at, updated_at)
    VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::text, $4::"Gender", $5::integer, $6::text, $7::text, $8::integer, NOW(), NOW())`;

  for (const part of parts) {
    const voterCount = rand(100, 150);

    // Wrap each part's voters in a transaction for speed
    await client.query('BEGIN');

    for (let i = 0; i < voterCount; i++) {
      const gender = Math.random() < 0.48 ? 'MALE' : Math.random() < 0.96 ? 'FEMALE' : 'OTHER';
      const firstName = gender === 'MALE' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
      const lastName = pick(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const age = rand(18, 85);
      const mobile = randomMobile();
      const epic = randomEpic();
      const slNumber = i + 1;

      await client.query(INSERT_SQL, [electionId, part.id, name, gender, age, epic, mobile, slNumber]);
    }

    await client.query('COMMIT');

    totalInserted += voterCount;

    // Update part voter counts
    const counts = await client.query(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE gender='MALE') as male, COUNT(*) FILTER (WHERE gender='FEMALE') as female, COUNT(*) FILTER (WHERE gender='OTHER') as other FROM voters WHERE part_id = $1`,
      [part.id]
    );
    const c = counts.rows[0];
    await client.query(
      'UPDATE parts SET total_voters=$1, male_voters=$2, female_voters=$3, other_voters=$4 WHERE id=$5',
      [parseInt(c.total), parseInt(c.male), parseInt(c.female), parseInt(c.other), part.id]
    );

    if (part.part_number % 10 === 0 || part.part_number === 1) {
      console.log(`  Part ${part.part_number}: ${voterCount} voters (total so far: ${totalInserted})`);
    }
  }

  // Update election total
  const totalVoters = await client.query('SELECT COUNT(*) as cnt FROM voters WHERE election_id=$1', [electionId]);
  await client.query('UPDATE elections SET total_voters=$1 WHERE id=$2', [parseInt(totalVoters.rows[0].cnt), electionId]);

  console.log(`\nDone! Inserted ${totalInserted} voters across ${parts.length} parts`);
  console.log(`Avg: ${Math.round(totalInserted / parts.length)} voters/part`);

  await client.end();
}

run().catch(e => { console.error(e); client.end(); });
