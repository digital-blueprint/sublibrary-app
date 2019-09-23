import ejs from "ejs";
import { readFileSync } from "fs";

export default function ejsAssetPlugin(inPath, outPath, data = {}) {
  return {
    name: "ejs-asset-plugin",
    buildStart() {
      this.addWatchFile(inPath);
      const template = readFileSync(inPath).toString();
      const output = ejs.render(template, data);
      this.emitFile({type: 'asset', source: output, name: inPath, fileName: outPath});
    }
  };
}
