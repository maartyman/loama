# Linked Open Access Management Application with UMA

This documentation describes the important changes made to transform the loama controller to UMA. 

## Controller Structure

The controller contains the important, high level operations that loama provides. These operations are the ones to edit (add, delete) permissions, get permission information for each target and add/delete subjects. Other functional parts, like handling requests, are not relevant for these changes. 

To handle different subjects (public and webID), the controller uses preconfigured managers and resolvers. Each manager and resolver handles specific tasks for one subject. Some managers have common tasks, which are grouped in a common manager called `InruptPermissionManager.ts`. 

To also not make the managers too big, they use specific policy related helper classes: `PolicyParser`, `PolicyInterpreter` and `PoliyEditor`. These classes provide the basic functionality for the managers to implement their functions. 

### Policy Helper Classes

This section handles the implementation of the `PolicyParser`, `PolicyInterpreter` and `PoliyEditor`. They do not follow the generic type system as used in the rest of the controller-structure.

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
- `fetchPolicies`: Retrieve every policy that you own, and turn it into an N3 store. To keep layers clean, we might want to move this to a policy related helper class, since it would make sense to only make server calls from a centralized place.
- `fetchOnePolicy`: Retrieve one specific policy as an N3 store. This could also be moved.
- `getContainerPermissionList`: Get every target where you are the assigner of its policy. Since we need every target, independent of the subject, it could be placed here.
It is to be said that the meaning of this function changed. The old implementation fetched the permissions for one specific container, we fetch it from the logged on user. This makes the argument `containerUrl: string` redundant. The argument `resourceToSkip: string[] = []` has been ignored, since no useful purpose of this was found.

There are also functions here where it would make more sense to move them to their specific subject manager.
- `getRemotePermissions`: Get the permissions for one single target. We do retrieve the information in a way that we get every subject, but we need to handle those subjects in the common managers. This means adding a new subject would require changes in the common manager, which would be cleaner if moved to the separate managers.
- `getTargetPermissionsForUser`: A specific version of getRemotePermissions, where we are only interested in the permissions for one user on one target. This must be moved to the underlaying managers. This function will probably be removed in the future. 

#### Underlaying Managers
Because most of the work is done in the `PolicyEditor` and `PolicyInterpreter`, there is no big implementation in the managers. The `createPermissions` and `deletePermissions` functions are one-liners, and the `editPermissions` is not actually needed in this implementation. 

### Controller
High level logic is implemented in the controller. It uses the managers to delegate the main functionality of the application. The functions that remained unchanged are:
- `getSubjectConfig`: Given a subject, return is its configuration (manager, resolver).
- `getExistingRemotePermissions`: Given a resource and a subject, get the list of permissions of that subject for the resource.
- `AccessRequest`: Returns the IAccessRequest
- `getLabelForSubject`: Uses the resolver of the subject to return its label.
- `isSubjectSupported`: Check if there is a configuration that supports the subject type.


The functions that have a new implementations are the following:
- `addPermission`: The new implementation became very short:
    1. Let the specific manager create the permission for the subject.
    2. Even though the server already returns an updated version, we cannot return this in the current interface. We just fetch the new permissions using  `getTargetPermissionsForUser` from the manager, which we might change to the `getExistingRemotePermissions` from the controller.
- `removePermission`: Works exactly the same as `addPermission`, uses the deletePermissions function from the manager.
- `getContainerPermissionList`: This is nothing but a call to the manager's `getContainerPermissionList` function. Its implementation has been reduced a lot, but the current way is not clean. Because we know that we only need one manager to get every target and their permission info, we need to force our way to get only one. To quickly select only one type, an indicator was added to the interface. We now select the manager of this type, and execute the function. Of course, this is not clean. It's just a quick way to make things work, and will be replaced.
- `getResourcePermissionList`: Works exactly the same as `getContainerPermissionList`, it just calls the `getRemotePermissions`. If we were to replace this function from the common manager to its children, this would be cleaner.


The functions that are yet to be changed are the following:
- `enablePermissions`/`disablePermissions`: We need an elegant way to implement this.
-  `removeSubject`: Remove a subject from all its permissions. This would just be a remove call with the four possible permissions.

The functions that we do not need in the new implementation are:
- `getExistingPermissions`: Our implementation always gets the data straight from the server. This function was used in the index-context, which has been replaced by the UMA-server.
- `updateItem`: This function was used to set certain permissions for a target. Because our functionality only uses `addPermission` and `removePermission`, no `updateItem` is necessary. 
- Index related functions that we no longer need:
    - `setPodUrl`
    - `unsetPodUrl`
    - `getOrCreateIndex`
    - `getItem`

    The downside of these functions is the fact that the front end still uses some, but they don't need to anymore. 


## Impact of UMA
The introduction of the UMA server to this project reduced the controller and manager side significantly. It introduced independent classes to handle the server calls (PolicyParser and -Editor) and to turn policies into the format required by the frontend (PolicyInterpreter). 

Because the most important part of the logic is implemented in those independent classes, the managers and controllers take on a delegating role. The reason why it's still important to have them, is to separate concerns:
- The controller contains top level, generic functionality. They just need to call the right managers based on the relevant subjects. The controller does not have any direct contact to the independent Policy helper classes.
- Managers contain specific functionality. They are in direct contact with the Policy Helper classes.