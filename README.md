## VPU Library Shelving Web Component

[GitLab Repository](https://gitlab.tugraz.at/VPU/Middleware/LibraryShelvingWC)

## Local development

```bash
npm install

# constantly builds dist/bundle.js 
npm run watch-local

# run local webserver
cd dist; php -S localhost:8001
```

Jump to <http://localhost:8001> and you should get a Single Sign On login page.

Example book barcodes: `+F55555`, `+F123456`, `+F1234567`


## Remote development

<https://mw-frontend-dev.tugraz.at/vpu-library-shelving/>

Run `npm run watch-dev` to build the `dist/bundle.js` constantly and upload the `dist` folder to the server.
