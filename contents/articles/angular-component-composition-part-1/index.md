---
title: Angular Component Composition - Part 1 - Introduction
author: nicholas-boll
date: 2015-08-08 15:00
template: article.jade
tags: angular,javascript,component,composition
comments: true
---

## Components
"Components" is becoming a popular word in web development. The term is vague and generally means small parts. I did a talk recently at a [local meetup](http://www.meetup.com/RockyMountainAngularJS/events/223604028/) (video [here](https://www.youtube.com/watch?v=BYVesUiUpI4)) about how we at [LogRhythm](https://www.logrhythm.com) use Angular to create re-usable components. The definition of components extends to backend infrastructure, middle-layer and UI. This series will be mainly focusing on UI components.

## Composition
Composition as in [composition over inheritance](https://en.wikipedia.org/wiki/Composition_over_inheritance). AngularJS encourages this with dependency injection of services into controllers, but what is often overlooked as directives provide an excellent way to compose UI components. I don't mean nesting a component within another component, but truly composing a component directive with other directives. This is what my talk was about and I would like to step through how that is possible and why it is a good idea.

## How do we do it?
I'm going to define a few terms I'll use over this series: *Component*, *Decorator* and *Component Decorator* (The Angular team changed *Decorator* to *Directive* to not have a naming collision with [ES2016 Decorators](https://medium.com/google-developers/exploring-es7-decorators-76ecb65fb841)). The first two are well-defined by the community (I've added a few extras). The last is what really adds composition to UI and I make heavy use of.

#### Component
* Element selector
* Isolate scope
* Has a template
* Has a controller
* Has a model

#### Decorator
* Attribute selector
* Does not have a template
* Has a controller
* Has a model

#### Component Decorator
* Attribute selector
* Does not have a template
* Requires a Component or Directive

First, we need to make a component and make sure it has a controller. Actually, for my first example I'm going to make a *Decorator*, but it acts like a *Component*. The component should be as minimalistic as possible. This allows for maximum composition with *Component Decorators*.

## Tooltip Decorator

<iframe src="http://embed.plnkr.co/uCQtLoBqcLbFhvRFG0so/preview" width="100%" height="300px"></iframe>

Usage:
```html
<span tooltip tooltip-message="'Hello World!'">Hover over me!</span>
```

Controller:
```javascript
function TooltipController () {

  // API for state
  this.model = new TooltipModel({});
}

TooltipController.prototype.show = function showTooltip () {
  if (this.model.shouldShow) {
    this.model.isShowing = true;
  }
};

TooltipController.prototype.hide = function hideTooltip () {
  this.model.isShowing = false;
}
app.controller('TooltipController', TooltipController);
```

Model:
```javascript
function TooltipModel (config) {
  // Boolean - if the tooltip should be shown - component decorators can modify this property.
  this.shouldShow = config.shouldShow || true;

  // Boolean - if the tooltip is currently being shown. Component decorators can use this property to test if the tooltip is being shown
  this.isShowing = config.isShowing || false;

  // String - the message the tooltip contains. It is an angular expression
  this.message = config.message || '';

  // Number - the x coordinate of the tooltip
  this.x = config.x || 0;

  // Number - the y coordinate of the tooltip
  this.y = config.y || 0;
}
```

`tooltip` Decorator:
```javascript
app.directive('tooltip', function($compile) {
  return {
    restrict: 'A',
    controller: 'TooltipController',
    // controllerAs: 'tooltip', // we won't use this since we are kind of stepping outside normal angular stuff

    link: function tooltipLink ($scope, $element, $attrs, TooltipController) {
      var $body = angular.element(document.body);
      var $tooltipElement;
      var tooltipScope = $scope.$new(true); // new isolate scope
      tooltipScope.tooltip = TooltipController; // controllerAs in the isolate scope

      // events
      $element.on('mouseover', function onMouseover (event) {
        TooltipController.setPosition(event.clientX + 10, event.clientY + 10);
        TooltipController.show();
        tooltipScope.$digest(); // let Angular know something interesting happened - local digest for performance
      });

      $element.on('mouseout', function onMouseout (event) {
        TooltipController.hide();
        tooltipScope.$digest(); // let Angular know something interesting happened - local digest for performance
      });

      // react to state changes
      tooltipScope.$watch('tooltip.model.isShowing', function (isShowing) {
        if (isShowing) {
          // lazy initialization of tooltip contents
          if (!$tooltipElement) {
            $tooltipElement = $compile('<div class="tooltip">{{tooltip.model.message}}</div>')(tooltipScope);
          }
          $tooltipElement.css({
            top: TooltipController.model.y + 'px',
            left: TooltipController.model.x + 'px'
          });
          $body.append($tooltipElement);
        } else {
          $tooltipElement && $tooltipElement.remove();
        }
      });
    }
  };
});
```

`tooltip-messsage` Component Decorator:
```javascript
app.directive('tooltipMessage', function () {
  return {
    restrict: 'A',
    require: 'tooltip',

    link: function tooltipMessageLink ($scope, $element, $attrs, TooltipController) {
      $scope.$watch($attrs.tooltipMessage, function (message) {
        TooltipController.model.message = message;
      });
    }
  }
});
```

#### Why a controller?
The controller of a component becomes the API for other component decorators. When a component decorator requires the component, it will gain access to the instance of that components controller. This is a very powerful concept for composition of components. Decorator components should interact directly with the controller and model.

#### Why a model?
All components should have a strongly typed model - it becomes the state API for other component decorators and the application. The model should only contain state and no logic.

#### Why a big link function?
The link function should be where events are attached and model watches happen. This allows the controller to be unit tested without DOM. In our project, all controllers and services are unit tested. Component link functions are not unit tested, but rather integration tested through [Protractor](https://angular.github.io/protractor/). We do integration testing of components because of the complex differences between browsers.

#### Component
The the component should interact with the controller and model. It should observe the model state and react to changes rather than directly respond to user events. This separation allows component decorators to call controller methods and the component will just react to state changes and makes controllers easier to test in isolation (without a DOM).

#### Why is `tooltip-message` a directive?
`tooltip-message` is a *Component Decorator*. Notice how it requires the `tooltip` *Decorator* and gets the instance of its controller. It sets up a one-way (**Note**: NOT two-way) binding that updates the component's model. This pattern allows the component to just worry about displaying model state with component decorators effecting that state in interesting ways.

#### `tooltip-overflow` Component Decorator:
```html
<p style="max-width: 100px;" tooltip tooltip-message="longtext" tooltip-overflow>{{longtext}}</p>
```
```javascript
app.directive('tooltipOverflow', function () {
  return {
    restrict: 'A',
    require: 'tooltip',

    link: function tooltipOverflowLink ($scope, $element, $attrs, TooltipController) {
      $element.on('mouseover', function (event) {
        if ($element[0].scrollWidth > $element[0].clientWidth) {
          TooltipController.model.shouldShow = true;
        } else {
          TooltipController.model.shouldShow = false;
        }
      });
    }
  }
});
```

Now things get interesting. We can conditionally show a tooltip. In this case, when the user moves the mouse over the tooltip target, the width is evaluated to see if an ellipsis is present. If an ellipsis is present, the tooltip will display, otherwise it will not. Try changing the tooltip value in the input in the provided example. For efficiently, the value is evaluated when the user mouses over and not when the tooltip value changes. This keeps watches light (NEVER do DOM measurement inside a `$watch` - it will really hurt the performance of the application).

## Conclusion
The whole idea of composition is to have a small base component with decorators that modify the behavior. These decorators should be small and only do one thing. This is a difficult balance, but keeps additional features to be additional decorators rather than modification of the root component. The alternative is a very large component with a growing number of config flags. We use this composition model to separate our component UI from our application (different code repositories). Usually application component decorators interact with the component API to give the component data. This way we can completely test all expected behaviors of components void of any application dependencies.
