---
title: Angular Component Composition - Part 2 - Dropdown Component
author: nicholas-boll
date: 2015-08-30 13:00
template: article.jade
tags: angular,javascript,component,composition
comments: true
---

## Building the dropdown component
This article builds on [Part 1 - Introduction](../angular-component-composition-part-1/) of the series. Please take some time to read that article first (should only take a few minutes).

The introduction built a very simple component to showcase the idea of component composition. Now we will go in-depth starting with a dropdown component. There are many examples of dropdowns available, but this is going to be a minimalistic component that will be very easy to extend.

## Composition
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

I'm going to use ES6 from now on. Here is the model for the dropdown:

## Model
```js
var DropdownModel = Scheming.create({
  display: {
    type: String,
    default: null
  },
  placeholder: {
    type: String,
    default: 'Please Select'
  },
  intent: {
    type: '*',
    default: null
  },
  options: {
    type: ['*'],
    default: []
  },
  isOpened: {
    type: Boolean,
    default: false
  },
  isFocused: {
    type: Boolean,
    default: false
  }
});
```
The model determines the state of the component - and only this state. The model is meant to be reactive - the component's link and template react to model changes. We're using [Scheming](https://github.com/autoric/scheming) to give us a reactive model outside of Angular's `$scope`.

**Note:**
This is actually a very important part of component composition - models are where state is held and we can observe these state changes outside of Angular's `$scope` hierarchy. Without this observable model, component decorators would not work because the decorator's scope isn't actually the component's scope.

## Controller
```js
class DropdownController {
  constructor (uiDropdownModel) {
    if (!this.model) {
      this.model = new uiDropdownModel();
    }
  }

  setOptions (options = []) {
    this.model.options = options;
  }

  selectItem (item) {
    this.model.display = item;
    this.model.isOpened = false;
  }

  isIntent (item) {
    return item === this.model.intent;
  }

  setIntent (item) {
    this.model.intent = item;
  }

  focus () {
    this.model.isFocused = true;
    this.model.isOpened = true;
  }

  blur () {
    this.model.isFocused = false;
    this.model.isOpened = false;
  }
}
```
The controller is meant to house methods that interact with the model - the view should not directly interact with it. This separation allows the controller to be easily unit tested. The controller's constructor has tests for a model to be predefined and will create a new on if not defined. I have done this to allow the component to be part of an owning component to pass down an instantiated model. This can be very useful for components like tabsets where something else wants to change tabs - after all, the model is just state and the view just renders that state. I haven't found a good use-case to make dropdown models owned by a container, but to be consistent, all components have this feature. The rest of the controller will make more sense with the directive.

## Dropdown Component
```js
function DropdownComponent () {
  return {
    restrict: 'E',

    scope: {
      model: '=uiDropdownModel'
    },

    controller: 'uiDropdownController',
    controllerAs: 'dropdown',
    bindToController: true,

    require: ['uiDropdown', '?ngModel'],

    template: `
      <button
        ui-dropdown-button
        type="button"
        class="ui button selected"
        ng-disabled="dropdown.model.isDisabled"
        ng-class="{focus: dropdown.model.isFocused}"
      >
        {{ dropdown.model.display || dropdown.model.placeholder }}
      </button>
      <div class="options-container" ng-if="dropdown.model.isOpened">
        <ul class="options" role="menu">
          <li
            class="option"
            role="menuitem"
            ng-repeat="item in dropdown.model.options"
            ng-mouseover="dropdown.setIntent(item)"
            ng-class="{intent: dropdown.isIntent(item)}"
            ng-click="dropdown.selectItem(item)"
          >
            {{item}}
          </li>
        </ul>
      </div>
    `,

    link: {

      pre: function ($scope, $element, $attrs, [dropdown, ngModel]) {

        // ngModel - only two-way data-binding allowed
        if (ngModel) {
          ngModel.$render = function () {
            dropdown.selectItem(ngModel.$viewValue);
          };

          $scope.schemingWatch(dropdown.model, 'display', function (value, oldValue) {
            if (value !== oldValue) {
              // tell ngModel about a change only if there is one
              ngModel.$setViewValue(value);
            }
          });

          // observed view properties
          $scope.schemingWatch(dropdown.model, ['isOpened', 'isFocused', 'options'], function () {
            $scope.$digest();
          });

        }
      },

      post: function ($scope, $element, $attrs, [dropdown, ngModel]) {
        $element.on('mousedown', (event) => {
          // prevent unintended focus changes
          event.preventDefault();
        });
      }
    }
  };
}
```
Like the tooltip component in the introduction, the link function is large here as well. The component uses a factory function that returns a Directive Definition Object. I will use this pattern until something like [angular.compoent](https://github.com/angular/angular.js/issues/10007) is released. I'll note some choices here:

### Restrict
```js
restrict: 'E'
```
All components should be element selectors - it is easier to recognize them at a glance and it is obvious who owns the isolate scope.

### Scope
```js
scope: { model: '=uiDropdownModel' }
```
All components should have an isolate scope. While this is technically a 2-way reference binding, the reference should never be changed by either side. Items here should be intended as 1-way data bound properties (like props in [ReactJS](http://facebook.github.io/react/)). I tend to prefix all properties with `ui-{component_name}-` to make an obvious association with the component. It is temping to create config properties here - I suggest avoiding the urge as it defeats the purpose of small, composable components. More on this later.

### Controller
```js
controller: 'uiDropdownController',
controllerAs: 'dropdown'
```
All composable components should have a controller and that scope name should be a short name of the component. The controller is referenced by a string for unit testing. It is possible to grab a controller registered with a DDO, but it is silly and difficult.

### BindToController
```js
bindToController: 'true'
```
This sets the scope to bind directly to the controller instead of `$scope`. We are trying to avoid `$scope` as much as possible - keeping as much DOM logic in the link function as possible. In this component, defining `ui-dropdown-model="someDropdownModel"` will actually set the `model` property directly on the controller instance and will be defined by the time the constructor is called. Handy.

### Require
```js
require: ['uiDropdown', '?ngModel']
```
The optional `ngModel` requirement will inject the instance of the `ng-model` controller into the linking function. This allows the dropdown component to act like other form elements with value binding, validation, etc.

### Template
The template is inlined for [performance](http://plnkr.co/FIKuIpn9xl2FRliqV05R). You can use [Webpack](https://webpack.github.io/) or [Browserify](http://browserify.org/) to do this instead:
```js
require('./template.html');

// ...
return {
  template: template
};
```

The template contains a `ui-dropdown-button` helper directive to attach events to effect the state of the component. Composition can be parent/child.

### Link
The link function is broken into a `pre` and `post` link. It is currently considered bad practice to ever use `compile` or `preLink`, but `pre` and `post` link have an important distinction between when they get called in the lifecycle of compiling child components. `preLink` on a parent gets called *before* the `preLink` of a child. `postLink` on a parent gets called *after* the `postLink` of a child. You can find more information about the lifecycle of linking [here](http://www.jvandemo.com/the-nitty-gritty-of-compile-and-link-functions-inside-angularjs-directives/).

The `preLink` function sets up model/$scope listeners. The `preLink` also composes components - this is a little strange that controllers don't get this information (yet), but it is how we have to do it for now. The `preLink` fires right after the `controller` instantiates - which guarantees the component's controller is in the correct state for any child components. The dropdown also sets up `ngModel` hookups if present.

The `postLink` sets up DOM event listeners. This has to be done in `postLink` because in the case of transclusion, the `$element` variable will be the final DOM in `postLink`, but will be a cached clone in `preLink`.

## Dropdown Options Decorator
```js
function DropdownOptionsDecorator () {
  return {
    restrict: 'A',
    require: 'uiDropdown',

    link: {
      pre: function ($scope, $element, $attrs, dropdown) {
        $scope.$watchCollection($attrs.uiDropdownOptions, function (options) {
          if (options) {
            dropdown.setOptions(options);
          }
        });
      }
    }
  }
}
```

This decorator dog-foods our API to provide a very simple case for static options passed in from a parent source (ex: page controller).

Wait, why isn't `options` just passed into the dropdown component through the isolate scope definition? Well, we are trying to keep the dropdown component as light and composable as possible, without making any assumptions about how an application might use the component. Having options directly passed through and attribute makes an assumption that options are static and moves the responsibility of providing options to some view controller. This may seem reasonable, but what if we don't know the options ahead of time? What if getting options isn't the responsibility of a parent view controller? We ran into major issues with this type of assumption on a page with many dropdowns that all requested dynamic data as the user interacted with them. And dropdowns were used on more than one page, which meant binding logic had to be copy/pasted from one page controller to the next.


## Dynamic Dropdown Options Decorator
This example just uses `$timeout` to fulfill an options request, but the idea is that a request is made to a backend and a response comes back. This type of decorator would actually be part of the application's code since only your application knows how to talk to a backend.

```js
function DropdownDynamicOptionsDecorator ($timeout) {
  return {
    restrict: 'A',
    require: 'uiDropdown',

    link: {
      pre: function ($scope, $element, $attrs, dropdown) {
        $scope.schemingWatch(dropdown.model, 'isOpened', function (isOpened) {
          if (isOpened) {
            $timeout(function () {
              dropdown.setOptions(['a','b','c'].map((o) => $attrs.uiDropdownDynamicOptionsPrefix + ' ' + o));
            }, 50, false);
          } else {
            dropdown.setOptions([]);
          }
        });
      }
    }
  }
}
```

## More composition
Here is an example component in our application:
```js
<ui-dropdown
  class="small"
  placeholder="{{ AlarmsFilters.filters.byAlarmStatus.selected }}"
  ui-dropdown-keys="{ display: 'display', selected: 'selected' }"
  ui-dropdown-url="/html/templates/distinct-value.html"
  distinct-value-dropdown="alarmStatus"
  distinct-value-index="ALARM_INDEX_ID"
  distinct-value-transform="AlarmOptions.FilterByAlarmStatusOptions"
  lucene-query="alarmQuery"
  lucene-query-filter="{ field: 'alarmStatus', type: 'Number', modelKey: 'value' }"
  ng-model="AlarmsFilters.filters.byAlarmStatus"
  ng-class="{applied : AlarmsFilters.filters.byAlarmStatus.value !== AlarmsFilters.defaultFilters().byAlarmStatus.value}"
></ui-dropdown>
```

This is the dropdown component with a `distinct-value` decorator that gets distinct `alarmStatus` field values from the server - the guts of this decorator are very similar to the dynamic decorator shown earlier. The `lucene-query` decorator is optionally required by the `distinct-value` decorator to modify the query made to the server. There is actually many of these dropdowns on the page - all working together to create a filtered query for a result set. My recorded talk goes over this at [23:55](https://www.youtube.com/watch?v=BYVesUiUpI4&feature=youtu.be&t=1435)

## Conclusion
Component composition is a bit difficult in Angular 1.x, but very powerful. It allows us to compose smaller pieces together to make something very useful.
