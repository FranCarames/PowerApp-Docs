# App iOS — prompts por partes

**Antes de la Parte 1** (una sola vez), en la carpeta que contiene tu repo iOS:

```bash
git clone https://github.com/FranCarames/PowerApp-Backend.git
cd <tu-repo-ios>
claude --add-dir ../PowerApp-Backend
```

- Hacé una parte por sesión, o corré `/clear` entre partes: el contexto vive en `CLAUDE.md`.
- Cada parte termina con todo stageado. Commiteá antes de pasar a la siguiente.
- En lugar de pegar el bloque, podés decirle: *"Ejecutá la Parte N de `../PowerApp-Backend/Doc/app-ios/prompts.md`"*.

---

## Parte 1 — Contexto y estado del proyecto

```text
Arrancamos la app iOS de PowerApp. En esta parte no escribas código Swift.

1. Copiá ../PowerApp-Backend/Doc/app-ios/CLAUDE-ios.md a la raíz de este repo como CLAUDE.md, y leelo.
2. Relevá el proyecto: targets, scheme, si hay target de tests y los build settings (Swift Language Version, SWIFT_DEFAULT_ACTOR_ISOLATION, SWIFT_STRICT_CONCURRENCY, IPHONEOS_DEPLOYMENT_TARGET). Si falta el target de tests, pedime que lo cree desde Xcode: no edites el .pbxproj.
3. Corré el build para confirmar que el proyecto vacío compila. Después completá la sección "Verificación" de CLAUDE.md con el comando real, con el scheme y el simulador que usaste.
4. Si no hay .gitignore, sumá uno estándar de Xcode y Swift.
5. Dejá todo stageado y pasame un resumen del relevamiento.
```

## Parte 2 — Arquitectura base

```text
Parte 2: arquitectura base con Clean Architecture y SwiftUI. Todavía sin networking ni modelos.

Traeme estas decisiones de a una, con opciones y tu recomendación:
1. Modularización: un target con carpetas por capa, o paquetes SPM locales por capa.
2. Deployment target y modo de concurrencia, según lo que relevaste en la Parte 1.
3. Patrón de presentación y navegación. Mi punto de partida: MVVM con @Observable y NavigationStack.
4. Inyección de dependencias. Mi punto de partida: un composition root manual, pasado por Environment.

Después escribí la spec y el plan, y esperá mi OK. Recién ahí implementá:
- Las capas App, Core, Domain, Data y Presentation (o la variante acordada), con esta regla: Domain no importa SwiftUI ni conoce DTOs, Presentation no conoce DTOs y Data implementa los protocolos de Domain.
- El composition root y una RootView placeholder.
- La sección "Arquitectura" de CLAUDE.md, con la estructura y la regla de dependencias.

Cerrá con el build en verde y todo stageado.
```

## Parte 3 — Networking

```text
Parte 3: capa de networking. Antes de diseñar, leé la sección "Contrato de la API" de ../PowerApp-Backend/Doc/app-ios/contexto-backend.md y verificá cada punto contra power-app/src.

Traeme estas decisiones de a una:
1. Entornos: cómo se elige la URL base (xcconfig o código) y cuál es el default en Debug (Render, el back en la Mac o el back en la PC por la LAN).
2. Tipo de los ids: String, UUID o un id tipado por entidad. Tené en cuenta lo de las mayúsculas y los ids de vínculo.

Después escribí la spec y el plan, y esperá mi OK. Recién ahí implementá:
- Un cliente async/await sobre URLSession, detrás de un protocolo, con endpoints declarativos: método, path, query, body y si requieren auth.
- El manejo del token: se guarda en Keychain, se lee del header de la respuesta en el login y el registro, y se inyecta sólo en los endpoints autenticados.
- Errores tipados que entiendan los dos formatos del back, con el manejo de 401 y 403 que describe el contexto.
- Encoder y decoder centralizados: los dos formatos de fecha (las de día, sin corrimiento) y CodingKeys explícitas.
- Un timeout configurable, y logging sólo en Debug, sin el token ni contraseñas.

Testeá todo con Swift Testing y un stub de URLProtocol. Cerrá con build y tests en verde y todo stageado.
```

## Parte 4 — Modelos de datos

```text
Parte 4: modelos de datos. Leé la sección "Modelo de dominio" de ../PowerApp-Backend/Doc/app-ios/contexto-backend.md.

1. Recorré los controllers, services y DTOs del back y armá Docs/api-contract.md. Por módulo, cada endpoint con su verbo, ruta, roles, CU, DTO de request, la forma real de la respuesta (sacada del service) y el estado del CU según el Status. Cerralo con la sección "Huecos del back".
2. Traeme una decisión: si los DTOs cubren sólo los endpoints de Usuario, Entrenador y auth (mi recomendación, porque Admin no tiene UI) o todos.
3. Después escribí la spec y el plan, y esperá mi OK. Recién ahí implementá:
   - Entidades de dominio para las 20 tablas del diagrama. Las de vínculo pueden vivir dentro de su agregado, pero no puede faltar ninguna. Lo de ParaValidar/ no se modela.
   - DTOs Codable 1:1 con el JSON real, y DTOs de request idénticos a los del back.
   - Mappers de DTO a dominio.
4. Testeá con un fixture JSON por respuesta, armado a partir de lo que devuelve el service real, cada uno con su test de decodificación y de mapeo.

Cerrá con una tabla de cobertura (tabla del diagrama → entidad → DTO → endpoint → estado del CU), build y tests en verde, y todo stageado.
```
