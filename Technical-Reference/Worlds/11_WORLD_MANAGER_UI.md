# World Manager UI

Deux clients sont fournis :

1. `/worlds` dans Next.js : catalogue, création, métriques, releases, promotion, memberships, archive.
2. `Orgo_World_Manager.pyw` : client Tkinter utilisant la même API HTTP, avec login local en mémoire, sans accès DB et sans stockage persistant du mot de passe ni du bearer token.

Le `WorldSwitcher` est visible dans la topbar runtime. Changer de World fait une navigation complète vers `/w/{key}/...`; le token de session est conservé en `sessionStorage` pour reprendre la session sans partager le token entre onglets ou sur disque.
