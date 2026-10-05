import { getRequestConfig } from "next-intl/server";
import messages from "../../messages/fr.json";

// Une seule langue en V1. Les textes vivent dans messages/fr.json.
export default getRequestConfig(async () => ({
  locale: "fr",
  messages,
}));
