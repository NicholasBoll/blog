---
title: Angular Component Composition - Part 2 - Dropdown Component
author: nicholas-boll
date: 2015-08-21 13:00
template: article.jade
tags: angular,javascript,component,composition
comments: true
---

## Building the dropdown component
This article builds on [Part 1 - Introduction](../angular-component-composition-part-1/) of the series. Please take some time to read that article first (should only take a few minutes).

## Component
The introduction built a very simple component to showcase the idea of component composition. Now we will go in-depth starting with a dropdown component. There are many examples of dropdowns available, but this is going to be a minimalistic component that will be very easy to extend.

### Composition
I like the Angular Bootstrap project because components there are very composable, but also very difficult to read. Here is an example from [UI Bootstrap](https://angular-ui.github.io/bootstrap/#/dropdown).

```html
<div class="btn-group" dropdown is-open="status.isopen">
  <button id="single-button" type="button" class="btn btn-primary" dropdown-toggle ng-disabled="disabled">
    Button dropdown <span class="caret"></span>
  </button>
  <ul class="dropdown-menu" role="menu" aria-labelledby="single-button">
    <li role="menuitem"><a href="#">Action</a></li>
    <li role="menuitem"><a href="#">Another action</a></li>
    <li role="menuitem"><a href="#">Something else here</a></li>
    <li class="divider"></li>
    <li role="menuitem"><a href="#">Separated link</a></li>
  </ul>
</div>
```

You can tell that block of HTML is a dropdown by looking at the template, right? Components should be an abstraction that is easy to think about in terms of real objects on the screen. Also why should the application developer have to be concerned with all the aria stuff? Lets start to build a dropdown from scratch, but this is the API we're going for:
```html
<ui-dropdown
  ui-dropdown-options="['a','b','c','d']"
  placeholder="Please Select"
  ng-model="selected"
></ui-dropdown>
```
