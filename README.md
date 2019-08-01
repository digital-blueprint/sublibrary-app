## VPU Library Shelving Web Component

[GitLab Repository](https://gitlab.tugraz.at/VPU/Middleware/LibraryShelvingWC)

## Local development

```bash
# get the source
git clone git@gitlab.tugraz.at:VPU/Middleware/LibraryShelvingWC.git
cd LibraryShelvingWC
git submodule update --init

# install dependencies (make sure you have npm version 4+ installed, so symlinks to the git submodules are created automatically)
npm install

# constantly build dist/bundle.js and run a local web-server on port 8001 
npm run watch-local

# run tests
npm test
```

Jump to <http://localhost:8001> and you should get a Single Sign On login page.

Example book barcodes: `+F55555`, `+F123456`, `+F1234567`


## Remote development

<https://mw-frontend-dev.tugraz.at/vpu-library-shelving/>

Run `npm run watch-dev` to build the `dist/bundle.js` constantly and upload the `dist` folder to the server.

## Demo system

Build bundle for the demo server

```bash
npm run build-demo
```
