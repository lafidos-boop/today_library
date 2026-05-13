import fs from 'fs';

try {
  const data = fs.readFileSync('data/db.json', 'utf8');
  const books = JSON.parse(data);
  console.log("Book at index 886:", JSON.stringify(books[886], null, 2));
  console.log("Book at index 887:", JSON.stringify(books[887], null, 2));
} catch (e) {
  console.error(e);
}
