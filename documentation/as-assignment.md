# How to assign an AS

Older versions of LOAMA had a hard-coded AS assignment in [the code](../loama/controller/src/classes/utils/PolicyService.ts).
In order to configure this easily, we introduced an environment variable `AS_URL`.
Once set, the code will fill this in automatically, so there is only one place you need to update this value if it changes.

For example, a simple `.env` file is sufficient:

```env
AS_URL="http://localhost:4000/uma/policies/"
```

Future expansions in the code could provide a more dynamic way of configuring the AS by allowing the user to switch from the UI to different servers with the one set in the environment variable as fallback option.
