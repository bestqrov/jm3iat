;/*FB_PKG_DELIM*/

__d("PolarisDirectActionThreadLoaded",["polarisNormalizeDirectThreads"],(function(t,n,r,o,a,i,l){"use strict";function e(e){var t=r("polarisNormalizeDirectThreads")([e]);return{messages:t.entities.items,threads:t.entities.threads,type:"DIRECT_THREAD_LOADED",users:t.entities.users}}l.threadLoaded=e}),98);
__d("PolarisDirectActionsLogger",["PolarisDirectLogger"],(function(t,n,r,o,a,i,l){"use strict";var e=new(o("PolarisDirectLogger")).DirectLogger("DirectActions");l.directActionsLogger=e}),98);