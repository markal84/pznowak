// Start pznowak-cms (Next.js + Payload) pod Phusion Passenger na MyDevil (FreeBSD, Node 24).
// Plik .cjs, bo `cms/package.json` ma "type": "module". Vhost wskazuje na niego jednym wierszem w
// `~/domains/<domena>/public_nodejs/app.js`:
//   require('/usr/home/<konto>/pznowak-cms-prod/cms/scripts/mydevil/app.cjs')
// Passenger sam przejmuje listen() – numer portu nie ma znaczenia.
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS dla Passengera */
'use strict'
const path = require('path')
const http = require('http')

const dir = path.resolve(__dirname, '..', '..') // katalog cms
const root = path.resolve(dir, '..') // katalog klonu repozytorium

process.chdir(dir)
process.env.NODE_ENV = 'production'
// FreeBSD: brak natywnego SWC – Next ma od razu brać wersję WebAssembly (bez prób pobierania do wspólnego /tmp).
process.env.NEXT_TEST_WASM = '1'
process.env.NEXT_TEST_WASM_DIR = path.join(dir, 'node_modules', '@next', 'swc-wasm-nodejs')
process.env.TMPDIR = path.join(root, 'tmp')
process.env.NEXT_TELEMETRY_DISABLED = '1'

const next = require(path.join(dir, 'node_modules', 'next'))
const app = next({ dev: false, dir })
const handle = app.getRequestHandler()

app
  .prepare()
  .then(() => {
    http.createServer((req, res) => handle(req, res)).listen(process.env.PORT || 3000)
  })
  .catch((err) => {
    console.error('pznowak-cms: start nieudany', err)
    process.exit(1)
  })
