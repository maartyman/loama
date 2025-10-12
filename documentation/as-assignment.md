# Dynamic assignment of Authorization Server

## General idea

The LOAMA frontend allows user to configure the authorization server with which they wish to communicate.
This way, users can have multiple different authorization servers to configure policies for policies hosted on different types of servers, e.g. UMA vs. SOLID.
The configuration allows the user to set the URL and choose from a preconfigured type of authorization server.
For each of these types, the LOAMA implementation should have a controller class that can handle communication with the backend.
Currently, only ODRL is supported.

When the user sets a new URL, the controller store will swap out the old controller with a new instance, configured to handle changes to policies configured on the new backend.
Users should note that they might need to refresh (or wait for autorefresh) to see the changes reflected in the frontend.

## Further work

Future implementations should aim to make the swapping of controllers as easily configurable as possible.
A single `configuration` object that is tailored to the needs of each controller should be sufficient.
The current implementation simply passes the URL of the authorization server for the `ODRLController`.
