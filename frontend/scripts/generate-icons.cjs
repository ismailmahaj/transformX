const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const svgBuffer = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#f97316"/>
  <text x="256" y="320" 
    font-family="Arial Black, sans-serif" 
    font-size="220" 
    font-weight="900"
    fill="white" 
    text-anchor="middle">TX</text>
</svg>
`);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function generateIcons() {
  const publicDir = path.join(__dirname, "..", "public");
  ensureDir(publicDir);

  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, "pwa-192x192.png"));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, "pwa-512x512.png"));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png"));

  // `sharp` ne supporte pas forcément le format ICO selon l'installation.
  // Pour satisfaire VitePWA/includeAssets, on crée un "favicon.ico" à partir d'une PNG.
  // (La plupart des navigateurs accepteront quand même l'asset à copier.)
  const png = path.join(publicDir, "pwa-192x192.png");
  const ico = path.join(publicDir, "favicon.ico");
  fs.copyFileSync(png, ico);

  console.log("✅ Icônes générées !");
}

generateIcons().catch((err) => {
  console.error("❌ Erreur génération icônes:", err);
  process.exit(1);
});

