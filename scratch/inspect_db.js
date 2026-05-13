import fs from 'fs';

try {
  const data = fs.readFileSync('data/db.json', 'utf8');
  const books = JSON.parse(data);
  console.log("Total Books:", books.length);
  console.log("First 5 Books Titles:", books.slice(0, 5).map(b => b.title));
  
  const sectionB = books.filter(b => b.location.shelf === 'B');
  console.log("Section B Books Count:", sectionB.length);
  if (sectionB.length > 0) {
    console.log("First Section B Book:", JSON.stringify(sectionB[0], null, 2));
  }
} catch (e) {
  console.error(e);
}
