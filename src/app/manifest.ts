import type { MetadataRoute } from "next";
import messages from "../../messages/fr.json";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: messages.app.name,
    short_name: messages.app.name,
    description: messages.app.description,
    lang: "fr",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    // Fond orange au lancement de l'application installée : il enchaîne avec
    // l'écran d'ouverture.
    background_color: "#f4632b",
    theme_color: "#f4632b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
