## Álbum API: ejecución local y reto

La configuración local usa PostgreSQL en Docker en `localhost:5433`. El puerto
5432 está ocupado también por PostgreSQL de Windows y causaba errores de
autenticación al intentar usar el contenedor original `pg-album`.
El contenedor de esta API es `pg-album-api`, con volumen `pg-album-api-data`.

```powershell
# Si el contenedor ya existe:
docker start pg-album-api

# Solo en una instalación nueva, si todavía no existe:
docker run --name pg-album-api -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=album -p 127.0.0.1:5433:5432 -v pg-album-api-data:/var/lib/postgresql -d postgres:18

# Copia .env.example a .env si aún no tienes configuración local.
npm install
npm run build
npm run start:dev
```

En otra terminal:

```powershell
Invoke-RestMethod "http://localhost:3000/api/fotos" | ConvertTo-Json -Depth 5
Invoke-RestMethod "http://localhost:3000/api/fotos/3" | ConvertTo-Json
```

`npm run seed` vacía fotos, álbumes, etiquetas y sus relaciones, reinicia sus ID
y crea 3 álbumes, 6 etiquetas y 20 fotos con relaciones aleatorias.
La operación se ejecuta en una transacción para revertirla si falla la carga.
`npm run start:prod` ejecuta la compilación en `dist/main.js`; configura
`NODE_ENV=production` para desactivar la sincronización automática del esquema.
En producción se debe preparar el esquema mediante migraciones antes de arrancar.

### Reto: columna opcional, renombrado y CRUD

La entidad `Foto` incluye `fotografo` como columna `text` opcional (`NULL`).
Se puede enviar en POST y PATCH; omitirla al crear una foto deja el valor en NULL.
`update` carga la foto, aplica los cambios y llama a `repository.save`.
`remove` carga la foto y llama a `repository.remove`; ambos devuelven 404 si no existe.
El controlador espera la eliminación antes de responder con 204.

Ejemplo de creación:

```powershell
$foto = Invoke-RestMethod -Uri "http://localhost:3000/api/fotos" -Method Post -ContentType "application/json" -Body '{"titulo":"Cerro","calificacion":5,"ruta":"x.jpg","fotografo":"Ana"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/fotos/$($foto.id)" -Method Patch -ContentType "application/json" -Body '{"fotografo":"Luis"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/fotos/$($foto.id)" -Method Delete
```

En pgAdmin, registra una conexión a `localhost`, puerto `5433`, usuario `postgres`,
contraseña `postgres` y base `album`. En Query Tool:

```sql
SELECT id, titulo, fotografo FROM public.fotos ORDER BY id;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'fotos'
ORDER BY ordinal_position;
```

Ejecuta la demostración del renombrado con:

```powershell
npm run reto
```

El script crea un esquema temporal propio, agrega la columna `autor`, inserta
`Ana Pérez`, cambia la definición a `fotografo` y aplica `synchronize`.
Muestra el SQL y los datos antes/después; al terminar elimina su esquema de prueba.
Las fotos de `public.fotos` no forman parte del experimento.

Resultado comprobado con las dependencias instaladas:

```text
Antes:    { id: 1, autor: 'Ana Pérez' }
SQL:      ALTER TABLE ... RENAME COLUMN "autor" TO "fotografo"
Después:  { id: 1, fotografo: 'Ana Pérez' }
```

En este caso los valores se conservaron: TypeORM detectó un renombrado simple.
No se debe afirmar que cambiar el nombre siempre borra los datos. Sin embargo,
`synchronize` compara el esquema con las entidades sin un historial explícito
de la intención del cambio. Otros cambios pueden eliminar/recrear columnas,
perder valores o fallar al convertir tipos. Por eso en producción se desactiva
y se usan migraciones revisadas, por ejemplo `ALTER TABLE fotos RENAME COLUMN
autor TO fotografo`, junto con respaldos.
Referencia: [documentación oficial de NestJS y TypeORM](https://docs.nestjs.com/data/typeorm).

Verificado: compilación y pruebas HTTP de listado, creación, actualización,
persistencia tras reiniciar la aplicación, eliminación, 404 y parámetro inválido (400).

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It installs `@nestjs/observe`, wires it into `AppModule` and `main.ts`, and writes the app key and secret into `.env`, which every `nest start` script (`start`, `start:dev`, `start:debug`) then loads. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/sdk) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
