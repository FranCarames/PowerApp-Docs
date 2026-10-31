# BE-43 y T54 — Formato del teléfono (CU-U-06 y CU-U-01) · Plan

> **Numeración (leer primero).** El pedido original llamaba a este cambio **BE-42** (backend) y **T53** (web). Esos números ya estaban usados: **BE-42** y **T53** son «las rutinas del plan por semana» ([plan](2026-10-31-be-42-hallazgos-planificaciones-plan.md)), ya en `main`. Este cambio es **BE-43** (backend) y **T54** (web). Si alguien dice «la BE-42 y la T53» al hablar del teléfono, se refiere a estas dos. Los avisos amarillos de los planes de prueba ya dicen BE-43 y T54.
>
> **Este plan es de diseño:** lo escribió la sesión de docs el 31/10 con la regla cerrada por Fran. Lo leen la sesión del **backend** (sección 5) y la del **web** (sección 6). **Primero el back, después la web** (sección 7), aunque la web no depende de que la BE-43 esté en Render.

**Fuente:** la tanda 3 de [Pruebas de mi cuenta](../../Tests/Mi%20cuenta/Pruebas%20de%20mi%20cuenta.html) (31/10), hallazgo **VAL-05**: el teléfono acepta letras.
**Modelo:** sin cambios. **No cambia ninguna entidad ni el DDL**: no se toca `Db Creator`. `phone_prefix` y `phone_number` siguen siendo las mismas columnas.

**Goal:** que el teléfono sea un número de verdad. El número tiene solo dígitos y el código de país es «+» con 1 a 4 dígitos, en el registro y en Mi cuenta, y que ni el front ni el backend dejen guardar otra cosa.

---

## 1. El hallazgo

Un solo hallazgo, con tres casos de prueba que lo cubren: hoy el teléfono se valida solo por su largo, así que «abc» se guarda.

| Caso del plan de pruebas | Qué pasa hoy | CU | Lo arregla |
|---|---|---|---|
| **Mi cuenta · VAL-05** · Teléfono con letras (ya existía; la falla de la última tanda es contra la regla nueva) | «abc» como teléfono o como código de país se guarda | [CU-U-06](../../Use%20Cases/usuario/CU-U-06-editar-datos-personales.md), caminos alternativos | BE-43 y T54 |
| **Mi cuenta · VAL-06** · Teléfono con letras por la API (nuevo) | `POST /users/edit` con `{"phone_number":"abc"}` o `{"phone_prefix":"abc"}` responde 200 y lo guarda | CU-U-06, caminos alternativos | BE-43 |
| **Acceso · REG-10** · Teléfono con letras (nuevo) | El alta deja pasar «abc» en el número y en el código de país, y sale el `POST /users/register` | [CU-U-01](../../Use%20Cases/usuario/CU-U-01-registrar-usuario.md), caminos alternativos | T54 |

**Casos de uso** (ya reescritos):

- **CU-U-06:** el paso 3 suma el formato del teléfono, y «Datos inválidos» nombra el teléfono con letras.
- **CU-U-01:** el paso 2 decía «nombre, email, contraseña» y ahora dice «nombre, apellido, email, teléfono (código de país y número) y contraseña», que es lo que piden el formulario y el back. El paso 3 y «Datos inválidos» suman la misma regla del teléfono.

**Efecto en los planes de prueba** (ya aplicado, ver [`Tests/Mi cuenta/`](../../Tests/Mi%20cuenta/) y [`Tests/Acceso/`](../../Tests/Acceso/)): VAL-05 conserva el id y cambia pasos y resultado esperado; VAL-06 y REG-10 son nuevos. Los tres llevan aviso amarillo. **No cambian** REG-05, REG-06, REG-04, VAL-01 ni VAL-03: el tope de largo se chequea antes que el formato, así que los mensajes de largo son los mismos.

**Efecto en la tanda anterior:** la falla de VAL-05 se cierra cuando estén hechas la BE-43 y la T54 y se vuelva a correr.

---

## 2. La regla

1. **El número es solo dígitos, hasta 20.** El largo cuenta solo los dígitos.
2. **El front acepta espacios y guiones mientras se escribe** y los saca antes de mandar: se guardan solo los dígitos. «11 2345-6789» se guarda como `1123456789`.
3. **El código de país es «+» y de 1 a 4 dígitos** (`+54`, `+1`, `+598`). Sigue el tope de 10 caracteres.
4. **El tope de largo se chequea antes que el formato,** así los mensajes de largo no cambian.
5. **El backend no limpia nada:** valida lo que recibe. Un número con espacios o guiones que llegue directo a la API es un 400.

---

## 3. Contrato

### 3.1 Backend

`POST /users/register` y `POST /users/edit` validan:

| Campo | Regla | Topes que siguen |
|---|---|---|
| `phone_prefix` | `^\+\d{1,4}$` | 10 caracteres |
| `phone_number` | `^\d+$` | 20 caracteres |

- Si no cumple: **400** del `ValidationPipe`, con la forma de siempre: `{ statusCode: 400, message: [...], error: 'Bad Request' }`. **Los mensajes, en español, los elige el back.** La web no compara su texto (en Mi cuenta un 400 se ve como «Revisá los datos ingresados e intentá de nuevo.», DAT-08).
- **En `edit`, solo se valida si el campo viene en el body.** Un pedido que no trae el teléfono (por ejemplo, solo `last_name`) no se ve afectado.
- En `register` la regla se suma a lo que el DTO ya valida; no cambia nada más.

### 3.2 Web

Las validaciones del formulario, en el orden en que se evalúan. **Bajo Teléfono se muestra un solo error, el del primero que falle:** primero el código de país y, con el código bien, el número.

| # | Campo | Si… | Mensaje |
|---|---|---|---|
| 1 | Código de país | está vacío | «Ingresá el código de país» *(como hoy)* |
| 2 | Código de país | tiene más de 10 caracteres | «El código de país no puede tener más de 10 caracteres» *(como hoy)* |
| 3 | Código de país | no cumple `^\+\d{1,4}$` | **«Ingresá el código de país con + y números, por ejemplo +54»** *(nuevo)* |
| 4 | Número | está vacío | «Ingresá tu teléfono» *(como hoy)* |
| 5 | Número | tiene más de 20 caracteres | «El teléfono no puede tener más de 20 caracteres» *(como hoy)* |
| 6 | Número | tiene algo que no es un dígito | **«El teléfono solo puede tener números»** *(nuevo)* |

Los pasos 4 a 6 se evalúan **sobre el número sin espacios ni guiones,** que es lo que se manda: el largo cuenta solo los dígitos. Al enviar, `phone_number` va solo con dígitos. Si hay un error, no sale ningún request.

### 3.3 Aclaraciones que el pedido no decía (vetables)

Las fijó la sesión de docs para que el back y la web hagan lo mismo. Si Fran no está de acuerdo con alguna, se cambia acá.

1. **Espacios y guiones solo en el número.** El código de país no los acepta: «+ 54» o «+5-4» dan el mensaje del paso 3.
2. **Un número de solo espacios y guiones** queda vacío después de sacarlos y da «Ingresá tu teléfono» (paso 4).
3. **Cualquier otro carácter en el número** (letras, paréntesis, punto, un «+») da «El teléfono solo puede tener números».
4. **Mi cuenta muestra lo guardado tal cual:** el campo carga los dígitos y, después de guardar «11 2345-6789», muestra `1123456789`.

---

## 4. Los datos

- **No se migra nada.** El seed ya cumple la regla: los teléfonos son solo dígitos y el código de país está en `null`.
- **Una cuenta con letras ya guardadas** tiene que corregir el teléfono para volver a guardar desde la web: el formulario carga lo que hay y lo valida con la regla nueva. Por la API, un `edit` que no trae el teléfono sigue funcionando (3.1).

---

## 5. Backend (BE-43)

**Repo:** `D:\Power App\Backend\PowerApp-Backend`. **Esfuerzo estimado:** 0,5 h. **Cambia el esquema:** no.

| # | Cambio | Dónde |
|---|---|---|
| 1 | `CreateUserDto`: `@Matches(/^\+\d{1,4}$/)` en `phone_prefix` y `@Matches(/^\d+$/)` en `phone_number`, con mensajes en español | `create_user.dto.ts` |
| 2 | `EditUserDto`: lo mismo. Los campos ya son opcionales, así que solo se validan si vienen | `edit_user.dto.ts` |
| 3 | Los `@ApiProperty` de los dos campos, en los dos DTOs, suman `pattern` con la misma expresión, para que el Swagger lo documente | ídem |

**`Db Creator`:** sin cambios. No cambia ninguna entidad.

**Cómo se verifica:** con el build (`npm --prefix power-app run build`). **Acepta:** VAL-06 pasa cuando se despliega y se corre el plan (los dos pedidos dan 400 y no cambia nada). Como en cada cambio de código, el Status del backend se actualiza y se copia a `PowerApp-Docs/Status/` sin stagear.

---

## 6. Web (T54 de PowerApp-Web)

**Repo:** `D:\Power App\Web\PowerApp-Web`. **No depende de que la BE-43 esté en Render:** la regla vive en el cliente y no cambia el contrato.

| # | Cambio | Dónde |
|---|---|---|
| 1 | La regla de la sección 3.2 (código de país y número, con sus mensajes y su orden) | `shared/lib/userFields.ts`, que alcanza a **registro y Mi cuenta** |
| 2 | El campo del número acepta espacios y guiones al escribir; antes de enviar se sacan, y `phone_number` va solo con dígitos | ídem, en los dos formularios |

**Acepta:** VAL-05 (Mi cuenta) y REG-10 (Acceso) pasan. Siguen igual REG-04, REG-05, REG-06, VAL-01 y VAL-03.

---

## 7. Orden

1. **Backend (BE-43)** primero, en el repo del backend.
2. **Web (T54)** después. No tiene que esperar el despliegue de la BE-43.
3. **Docs:** al cerrar las dos, sacar los avisos amarillos (`kt` y `known`) de VAL-05, VAL-06 y REG-10, la mención en «Antes de empezar» de los dos planes, y volver a correr esos tres casos. La copia de `Status/` del web la trae el usuario.
