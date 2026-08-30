'use strict';
/* IA-Trading-Bot v1.8 Core entrypoint.
   The v1.8 build keeps the validated v1.7.9 Core extensions intact while
   introducing v1.8 engines/services (Risk Engine and firewall orchestration)
   outside the Core HTTP process. Future v1.8 Core changes should be applied
   here so Updates/current_release.dat always targets a version-matched server.
*/
require('./server_v1.7.9.js');
