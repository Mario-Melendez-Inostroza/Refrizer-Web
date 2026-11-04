---
name: correos-tienda
description: "Correos de la tienda: remitente de WooCommerce con buzón del dominio de la clienta, SPF/DKIM/DMARC y comprobación de que llegan a la bandeja y no a spam. Úsalo al configurar o depurar correos de pedidos."
---

# Correos de la tienda

## 5. Correos (el problema que más tiempo costó)

- El remitente de WooCommerce **nunca** debe ser un Gmail: Gmail lo trata como suplantación (DMARC FAIL) y manda todo a spam. Debe ser un buzón del dominio de la clienta, creado en su cPanel.
- *(Refrizer)* **El buzón se crea desde el cPanel de la clienta** (Cuentas de correo > Crear), p. ej. `ventas@dominio`; M define la contraseña y la clienta puede cambiarla después. Sirve también como correo de contacto del sitio (`site.email`) y como remitente de WooCommerce (nombre del remitente = la marca). Prueba: un pedido de prueba debe llegar a la **bandeja de entrada** de Gmail, no a spam. No inventar direcciones: si no existe el buzón, se crea o se le pide a la clienta.
- cPanel > Entregabilidad del correo: SPF, DKIM y DMARC en "Valid" (M instala los registros sugeridos; el DMARC `p=none` es el más suave).
- Verificación: en Gmail, "Mostrar original" del correo de una compra de prueba: **SPF, DKIM y DMARC en PASS**. Un dominio nuevo puede seguir en spam un tiempo aunque pase todo.
