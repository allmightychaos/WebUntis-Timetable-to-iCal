// src/core/save.js
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using `import.meta.url`
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.join(path.dirname(__filename), "..", "..");

export async function saveToFile(fileName, data) {
      try {
            const folderName = 'jsons';
            const filePath = path.join(__dirname, folderName, fileName);

            // Ensure the directory exists
            await fs.mkdir(path.join(__dirname, folderName), { recursive: true });

            // Write data to the file
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            console.log(`Saved ${fileName}`);
      } catch (err) {
            console.error(`Error writing ${fileName}:`, err);
      }
}