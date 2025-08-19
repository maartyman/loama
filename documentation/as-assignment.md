# Dynamic assignment of Authorization Server

Currently, the application makes use of a hard-coded AS assignment in [PolicyService.ts](../controller/src/classes/utils/PolicyService.ts).
This approach is not ideal for users, as one user might have his WebID registered with several Authorization Servers.
The way LOAMA talks to these ASs is through Controllers.
These Controllers have to be configured in such a way that LOAMA has a single interface to talk with them,
while these Controllers translate the requests coming from LOAMA to the format of the AS (e.g.: UMA AMA backend, ODRL, Google Drive's own format...)

Future implementations should aim to define a Controller for each of the AS types LOAMA wants to be able to talk to.
Say LOAMA supports three different AS platforms.
When the application starts, LOAMA can choose to let the user enter the URL and type of their AS, just like it prompts for the WebID.
LOAMA sees the type of AS and can then choose the right Controller instance.
This way, LOAMA needs to start only just as many Controller instances as it supports different AS platforms.

This is a reasonable trade-off between performance and decoupling.
Instead of creating a new Controller instance for each switch, LOAMA can simply switch the previous one out.

This idea is implemented as example in [this repository]().
