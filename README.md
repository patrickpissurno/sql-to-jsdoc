# sql-to-jsdoc
[![npm-version](https://img.shields.io/npm/v/sql-to-jsdoc.svg)](https://www.npmjs.com/package/sql-to-jsdoc)
[![known vulnerabilities](https://snyk.io/test/github/patrickpissurno/sql-to-jsdoc/badge.svg)](https://snyk.io/test/github/patrickpissurno/sql-to-jsdoc)
[![downloads](https://img.shields.io/npm/dt/sql-to-jsdoc.svg)](http://npm-stats.com/~packages/sql-to-jsdoc)
[![license](https://img.shields.io/github/license/patrickpissurno/sql-to-jsdoc.svg?maxAge=1800)](https://github.com/patrickpissurno/sql-to-jsdoc/blob/master/LICENSE)

Generate JSDoc annotations from raw SQL queries

## Install

`npm i -g sql-to-jsdoc`

## Usage

You'll need to have the following environment variables set:
- `DB_NAME` (database name)
- `DB_HOST` (database hostname)
- `DB_PORT` (database port)
- `DB_USER` (database username)
- `DB_PASS` (database password)

Then run:

```
sql-to-jsdoc query.sql
```

Or:

```
sql-to-jsdoc query.sql transform.json
```

Replacing *query.sql* for the name of a file containing the query, and
*transform.json* for the name of a file containing the optional transformation.

You can check out some pretty good docs about the transformations [here](https://github.com/patrickpissurno/sqlutils/blob/master/docs/transformer.md).

## Considerations

At the moment this tool only supports PostgreSQL databases. The generated
JSDoc annotations are meant to be used with [node-postgres](https://github.com/brianc/node-postgres).

I'll be revisiting this page soon to add more information and improve the documentation.

## License

MIT License

Copyright (c) 2022 Patrick Pissurno

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.