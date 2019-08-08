# VPU Library Application

[GitLab Repository](https://gitlab.tugraz.at/VPU/Apps/Library)

## Shelving Web Component

### Usage

```html
<vpu-library-shelving></vpu-library-shelving>
```

### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `<vpu-library-shelving lang="de"></vpu-library-shelving>`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
    - example `<vpu-library-shelving entry-point-url="http://127.0.0.1:8000"></vpu-library-shelving>`

## Local development

```bash
# get the source
git clone git@gitlab.tugraz.at:VPU/Apps/Library.git
cd Library
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

<https://mw-frontend-dev.tugraz.at/apps/library>

Run `npm run watch-dev` to build the `dist/bundle.js` constantly and upload the `dist` folder to the server.

## Demo system

<https://frontend-demo.tugraz.at/apps/library>

Build bundle for the demo server

```bash
npm run build-demo
```
