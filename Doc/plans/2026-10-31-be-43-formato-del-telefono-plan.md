# BE-43 y T54 — Formato del teléfono (CU-U-06 y CU-U-01) · Plan

> **Numeración (leer primero).** El pedido original llamaba a este cambio **BE-42** (backend) y **T53** (web). Esos números ya estaban usados: **BE-42** y **T53** son «las rutinas del plan por semana» ([plan](2026-10-31-be-42-hallazgos-planificaciones-plan.md)), ya en `main`. Este cambio es **BE-43** (backend) y **T54** (web). Si alguien dice «la BE-42 y la T53» al hablar del teléfono, se refiere a estas dos. Los avisos amarillos de los planes de prueba ya dicen BE-43 y T54.
>
> **Estado al 04/11.** La **BE-43 está hecha** (Status del backend, 31/10) y Fran la probó: el backend rechaza el teléfono inválido con 400. **Falta la T54:** la web tiene que frenar el teléfono inválido **antes de mandar el pedido** y avisar bajo Teléfono que es erróneo. La sección 6 se reescribió el 04/11 para poder tomarla sola; de afuera pide leer solo la regla (3.2) y sus aclaraciones (3.3).
>
> **Este plan es de diseño:** lo escribió la sesión de docs con la regla cerrada por Fran. Lo leyó la sesión del **backend** (sección 5, ya cerrada) y lo lee la del **web** (sección 6). Orden en la sección 7.

**Fuente:** la tanda 3 de [Pruebas de mi cuenta](../../Tests/Mi%20cuenta/Pruebas%20de%20mi%20cuenta.html) (31/10), hallazgo **VAL-05**: el teléfono acepta letras.
**Modelo:** sin cambios. **No cambia ninguna entidad ni el DDL**: no se toca `Db Creator`. `phone_prefix` y `phone_number` siguen siendo las mismas columnas.

**Goal:** que el teléfono sea un número de verdad. El número tiene solo dígitos y el código de país es «+» con 1 a 4 dígitos, en el registro y en Mi cuenta. **El front frena el teléfono inválido y avisa, sin mandar el pedido; el backend lo rechaza igual con 400 si le llega.**

---

## 1. El hallazgo

Un solo hallazgo, con tres casos de prueba que lo cubren: al 31/10 el teléfono se validaba solo por su largo, así que «abc» se guardaba.

| Caso del plan de pruebas | Qué pasaba el 31/10 | CU | Lo arregla | Estado (04/11) |
|---|---|---|---|---|
| **Mi cuenta · VAL-05** · Teléfono con letras (ya existía; la falla de la última tanda es contra la regla nueva) | «abc» como teléfono o como código de país se guardaba | [CU-U-06](../../Use%20Cases/usuario/CU-U-06-editar-datos-personales.md), caminos alternativos | BE-43 y T54 | Back hecho. **Falta la web** |
| **Mi cuenta · VAL-06** · Teléfono con letras por la API (nuevo) | `POST /users/edit` con `{"phone_number":"abc"}` o `{"phone_prefix":"abc"}` respondía 200 y lo guardaba | CU-U-06, caminos alternativos | BE-43 | Hecho; Fran lo probó |
| **Acceso · REG-10** · Teléfono con letras (nuevo) | El alta dejaba pasar «abc» en el número y en el código de país, y salía el `POST /users/register` | [CU-U-01](../../Use%20Cases/usuario/CU-U-01-registrar-usuario.md), caminos alternativos | T54 | **Falta la web** |

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
6. **El front frena antes de mandar** (agregada el 04/11): si el teléfono no cumple, no sale ningún pedido y la pantalla avisa bajo Teléfono. El 400 del backend es la red de seguridad, no la validación de la pantalla.

---

## 3. Contrato

### 3.1 Backend

`POST /users/register` y `POST /users/edit` validan:

| Campo | Regla | Topes que siguen |
|---|---|---|
| `phone_prefix` | `^\+\d{1,4}$` | 10 caracteres |
| `phone_number` | `^\d+$` | 20 caracteres |

- Si no cumple: **400** del `ValidationPipe`, con la forma de siempre: `{ statusCode: 400, message: [...], error: 'Bad Request' }`. **Los mensajes, en español, los elige el back.** La web no compara su texto ni lo usa para esto: los mensajes de la web son los de 3.2.
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

Los pasos 4 a 6 se evalúan **sobre el número sin espacios ni guiones,** que es lo que se manda: el largo cuenta solo los dígitos. Al enviar, `phone_number` va solo con dígitos.

**Si algún paso falla, el pedido no sale:** ni `POST /users/register` ni `POST /users/edit`. Vale para el registro y para Mi cuenta.

### 3.3 Aclaraciones que el pedido no decía (vetables)

Las fijó la sesión de docs para que el back y la web hagan lo mismo. Si Fran no está de acuerdo con alguna, se cambia acá.

1. **Espacios y guiones solo en el número.** El código de país no los acepta: «+ 54» o «+5-4» dan el mensaje del paso 3.
2. **Un número de solo espacios y guiones** queda vacío después de sacarlos y da «Ingresá tu teléfono» (paso 4).
3. **Cualquier otro carácter en el número** (letras, paréntesis, punto, un «+») da «El teléfono solo puede tener números».
4. **Mi cuenta muestra lo guardado tal cual:** el campo carga los dígitos y, después de guardar «11 2345-6789», muestra `1123456789`.
5. **El campo no filtra lo que se escribe.** Se puede escribir cualquier carácter y el error sale al enviar (VAL-05 y REG-10 escriben «abc» y esperan el error al guardar o registrar).
6. **Solo se sacan espacios y guiones.** Antes de validar y de mandar, lo único que se descarta del número son los espacios y los guiones. Nada más se limpia en silencio: «abc» no se convierte en vacío ni en otra cosa, da su error.

---

## 4. Los datos

- **No se migra nada.** El seed ya cumple la regla: los teléfonos son solo dígitos y el código de país está en `null`.
- **Una cuenta con letras ya guardadas** tiene que corregir el teléfono para volver a guardar desde la web: el formulario carga lo que hay y lo valida con la regla nueva. Por la API, un `edit` que no trae el teléfono sigue funcionando (3.1).

---

## 5. Backend (BE-43)

**Estado: hecha** (Status del backend, 31/10). **Repo:** `D:\Power App\Backend\PowerApp-Backend`. **Esfuerzo estimado:** 0,5 h. **Cambia el esquema:** no.

| # | Cambio | Dónde |
|---|---|---|
| 1 | `CreateUserDto`: `@Matches(/^\+\d{1,4}$/)` en `phone_prefix` y `@Matches(/^\d+$/)` en `phone_number`, con mensajes en español | `create_user.dto.ts` |
| 2 | `EditUserDto`: lo mismo. Los campos ya son opcionales, así que solo se validan si vienen | `edit_user.dto.ts` |
| 3 | Los `@ApiProperty` de los dos campos, en los dos DTOs, suman `pattern` con la misma expresión, para que el Swagger lo documente | ídem |

**`Db Creator`:** sin cambios. No cambia ninguna entidad.

**Cómo se verifica:** con el build (`npm --prefix power-app run build`). **Acepta:** VAL-06 pasa cuando se despliega y se corre el plan (los dos pedidos dan 400 y no cambia nada). Como en cada cambio de código, el Status del backend se actualiza y se copia a `PowerApp-Docs/Status/` sin stagear.

**Cómo quedó** (del Status del backend): las dos expresiones y los dos mensajes están en `dtos/user/phone_format.ts`, y el validador y el `pattern` del Swagger salen de la misma expresión. Los mensajes que eligió el back son «El código de país debe ser "+" seguido de 1 a 4 dígitos, por ejemplo +54» y «El teléfono solo puede tener números, sin espacios ni guiones». **La web no los usa:** los suyos son los de 3.2.

---

## 6. Web (T54 de PowerApp-Web)

**Repo:** `D:\Power App\Web\PowerApp-Web`. **Depende de:** nada. El backend ya está y el contrato no cambia. **Estado: pendiente.** Esta sección se reescribió el 04/11; con la regla de 3.2 alcanza para hacer la tarea.

### 6.1 Qué se pide

Fran probó la BE-43 el 04/11: el backend rechaza el teléfono inválido. Pide que la web también lo frene: **que la pantalla avise que el teléfono ingresado es erróneo y que no mande el pedido a la API.** El pedido no tiene que viajar para enterarse de que el teléfono está mal.

### 6.2 Qué tiene que pasar

1. **En los dos formularios:** el registro (`/registro`, botón «Registrarme») y Mi cuenta (`/cuenta/datos`, botón «Guardar cambios»). Al enviar, **antes de armar el pedido,** se evalúa la regla de 3.2.
2. **Si falla, el pedido no sale.** En Network no aparece ningún `POST /users/register` ni `POST /users/edit`. La pantalla no navega ni muestra «Cuenta creada» ni «Datos actualizados», y lo escrito se conserva.
3. **El error aparece bajo Teléfono,** con el mismo estilo que los errores de los otros campos. Es uno solo: el del primero que falle (código de país primero), con el texto exacto de 3.2.
4. **Si pasa, el pedido sale** con `phone_number` solo con dígitos (sin espacios ni guiones) y `phone_prefix` como está.
5. **La regla vive en un solo lugar,** `shared/lib/userFields.ts`, que ya alcanza a registro y Mi cuenta. Los dos formularios la usan; no se copia en cada pantalla.
6. **El error no depende del backend.** No se espera el 400 para avisar: la pantalla corta antes. El 400 queda como red de seguridad.
7. **Lo escrito no se filtra ni se limpia de más** (3.3.5 y 3.3.6): solo se sacan espacios y guiones del número, y recién al validar y mandar.

### 6.3 Casos para comprobar

El código de país es `+54` y el número `1198765432`, salvo donde la fila diga otra cosa. Vale igual en el registro y en Mi cuenta.

| Código de país | Número | Resultado |
|---|---|---|
| `+54` | `abc` | «El teléfono solo puede tener números» · **no sale el pedido** |
| `+54` | `11a2345678` | ídem |
| `+54` | `(11) 2345-6789` | ídem (los paréntesis no valen) |
| `+54` | `+541123456789` | ídem (el «+» no vale en el número) |
| `+54` | `11 2345-6789` | **sale** con `phone_number: "1123456789"` |
| `+54` | `1234 5678 9012 3456 7890` (20 dígitos con espacios) | **sale** con `phone_number: "12345678901234567890"` |
| `+54` | `123456789012345678901` (21 dígitos) | «El teléfono no puede tener más de 20 caracteres» · no sale |
| `+54` | `1234 5678 9012 3456 78901` (21 dígitos con espacios) | ídem: el largo cuenta solo los dígitos |
| `+54` | `aaaaaaaaaaaaaaaaaaaaa` (21 letras) | el mensaje de largo, no el de números: el largo va antes |
| `+54` | `   ` o `- -` | «Ingresá tu teléfono» · no sale |
| `abc` | `1198765432` | «Ingresá el código de país con + y números, por ejemplo +54» · no sale |
| `54` | `1198765432` | ídem (falta el «+») |
| `+` | `1198765432` | ídem (faltan los dígitos) |
| `+12345` | `1198765432` | ídem (5 dígitos) |
| `+ 54` | `1198765432` | ídem (el código no acepta espacios) |
| `+5412345678` (11 caracteres) | `1198765432` | «El código de país no puede tener más de 10 caracteres» · el largo va antes |
| vacío | `1198765432` | «Ingresá el código de país» |
| `abc` | `abc` | solo el error del código de país (el primero que falla) |
| `+54`, `+1`, `+598` o `+1234` | `1198765432` | **sale** |

Un caso más, solo de Mi cuenta: una cuenta con el teléfono guardado en «abc» (dato viejo, sección 4) abre Datos personales y el campo muestra «abc». Al guardar sin corregirlo sale «El teléfono solo puede tener números» y no sale el pedido; con un teléfono válido, sale.

### 6.4 Cómo se verifica

- Los chequeos de siempre del web: `typecheck`, `eslint src`, `build` y `prettier --check`.
- **En el navegador, con Network abierto** (filtrado por `users`): los casos de 6.3 en los dos formularios, en celular (390 px) y en escritorio. En cada fila «no sale», Network tiene que quedar vacío; en cada «sale», hay que mirar el body del pedido.
- Sin tests automáticos nuevos en el repo. Para la tabla alcanza un script descartable fuera del repo que llame a la función de `userFields.ts`.
- Los casos [VAL-05](../../Tests/Mi%20cuenta/Pruebas%20de%20mi%20cuenta.html) (Mi cuenta) y [REG-10](../../Tests/Acceso/Pruebas%20de%20acceso%20PowerApp.html) (Acceso) son la lista de aceptación: correrlos a mano antes de dar la tarea por cerrada. **Sacar sus avisos amarillos es de Docs** (sección 7).

### 6.5 Qué no hacer

- **No cambiar los mensajes de largo ni su lugar en el orden:** REG-04, REG-05, REG-06, VAL-01 y VAL-03 siguen como están.
- **No tocar el backend:** ya está hecho y probado.
- **No impedir que se escriban caracteres** en el campo (3.3.5): el error sale al enviar.

---

## 7. Orden

1. **Backend (BE-43): hecha** el 31/10 y probada por Fran el 04/11.
2. **Web (T54): pendiente,** sin dependencias.
3. **Docs:** al cerrar la T54, sacar los avisos amarillos (`kt` y `known`) de VAL-05 y REG-10, la mención en «Antes de empezar» de los dos planes de prueba, y volver a correr esos casos. **VAL-06 solo depende de la BE-43:** ya se puede volver a correr y sacarle su aviso, sin esperar a la web. La copia de `Status/` del web la trae el usuario.
