# Linked Open Access Management Application with UMA

This documentation describes the important changes made to transform the loama controller to UMA. 

## Controller Structure

The controller contains the important, high level operations that loama provides. These operations are the ones to edit (add, delete) permissions, get permission information for each target and add/delete subjects. Other functional parts, like handling requests, are not relevant for these changes. 

To handle different subjects (public and webID), the controller uses preconfigured managers and resolvers. Each manager and resolver handles specific tasks for one subject. Some managers have common tasks, which are grouped in a common manager called `InruptPermissionManager.ts`. 

To also not make the managers too big, they use specific policy related helper classes: `PolicyParser`, `PolicyInterpreter` and `PoliyEditor`. These classes provide the basic functionality for the managers to implement their functions. 

### Policy Helper Classes

This section handles the implementation of the `PolicyParser`, `PolicyInterpreter` and `PoliyEditor`.

#### PolicyParser

The `PolicyParser` is used to convert text into an `N3 store`. It does so by interpreting the text as Turtle, because that is what we receive from the server. The parser has only one method.

#### PoliyInterpreter

The `PolicyInterpreter` is the class that extracts the necessary information out of a given store. It contains one helper function, and two main functions:
- `ownedPoliciesToObject`: Get every policy for the logged on client, and group them by target. Return an information object for each target to indicate who has what permission, as documented in the code.
- `permissionsForOneResource`: Use the `ownedPoliciesToObject` with a specified target. This retrieves permission information for one single target.
- `extractQuadsRecursive`: Helper function to get all information about a subject with recursive depth, used in `ownedPoliciesToObject`.

#### PolicyEditor

The `PolicyEditor` is used to edit the existing permissions. The main functionality is to insert an atomic rule to add a new permission for a subject to a target, and the function to delete a permission for a subject to a target. 

- `insertActionRule`: Given the target ID, the permissions to add and the specified subject, create a new policy and a new rule for every action to be inserted. The new rule contains the logged on client as the assigner, the new subject as assignee (or none if no subject was specified, this means the subject is public), the target ID as odrl:target and the action to be inserted as odrl:action.

There are many things to be considered about this function.
1. It should actually not create a new policy for every added rule. 
2. It currently generates a random policy and rule ID, but does not check if it already exists. The chances are slim that this happens, but never zero.
3. The current version will always POST.

- `deleteActionRule`: Given the target ID, the permissions to be deleted and the specified subject, remove the atomic rules where the subject has these permissions for this target. 

The function 

This function also has many things to consider.
1. It first fetches and parses every policy of the logged on client. It then finds every policy where the subject has one of the permissions to delete. After this, it performs a query that tracks the rules to delete from every policy.
This is a lot of work, because the UMA server is very policy-oriented. We first need to extract the policies, to send the PATCH to `/policies/<encodedPolicyId>`. An idea could be to also make the server in able to work target-oriented. 

2. When every rule is deleted from a policy, the current implementation can still contain some 'dangling triples'. These are triples that contain information about a policy that does not have any rules anymore. This can be fixed by an extra step. After the deletion of every permission rule, we could GET every policy again, and look if there are any rules left in there. If not, we could DELETE the policy. This is also some work, so we are currently looking for better solutions.

3. Although it seems quite impossible, things like sparql-injection might need more attention


### Managers

The main managers are the `InruptPermissionManager`, the `WebIdManager` and the `PublicManager`. They contain the logic to perform the clientside operations on the policies.

#### InruptPermissionManager
This manager handles the functions that have the same implementation for underlaying managers. The methods in this manager are the following:
- `fetchPolicies`: Retrieve every policy that you own, and turn it into an N3 store.
- `fetchOnePolicy`: Retrieve one specific policy as an N3 store.
- `getContainerPermissionList`: Get every target where you are the assigner of its policy. Since we need every target, independent of the subject, it could be placed here.

There are also functions here where it would make more sense to move them to their specific subject manager.
- `getRemotePermissions`: Get the permissions for one single target. We do retrieve the information in a way that we get every subject, but we need to handle those subjects in the common managers. This means adding a new subject would require changes in the common manager, which would be cleaner if moved to the separate managers.
- `getTargetPermissionsForUser`: A specific version of getRemotePermissions, where we are only interested in the permissions for one user on one target. This must be moved to the underlaying managers.

#### Underlaying Managers
Because most of the work is done in the `PolicyEditor` and `PolicyInterpreter`, there is no big implementation in the managers. The `createPermissions` and `deletePermissions` functions are one-liners, and the `editPermissions` is not actually needed in this implementation. 

### Controller



## Impurities

The common manager, the `InruptPermissionManager.ts`, has one implementation to get all remote permissions for a target, and to get all permissions for a container. This is because it is not efficient to have one lookup for only public permissions, and one for only permissions via webID. Both goals are reached with the same procedure, thus it is done that way
