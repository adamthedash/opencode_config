---
name: bevy-rules
description: (no description)
disable-model-invocation: true
---

## Adding new QueryData
When a component already exists in a Query's filter section, and you are adding it to the data section. It can be removed from the filter section as everything in the data section is implicitly a filter.
Eg. before:  
```rust
Query<&ComponentA, (With<ComponentB>, With<ComponentC>)>
```
After:  
```rust
Query<(&ComponentA, &ComponentB), With<ComponentC>>
```

## Iterating over Children

`Children::iter()` has the following signature:  
```rust
fn iter(&self) -> impl Iterator<Item=Entity>
```

Here is an example snippet of how it can be used:   
```rust
let children: &Children = ...;
for child in children.iter() {
    // child is of type Entity
    commands.entity(child).insert::<MyComponent>();
}
```
