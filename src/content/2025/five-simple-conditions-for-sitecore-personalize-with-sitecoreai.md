---
title: "Launch Faster: 5 Simple Conditions for Sitecore Personalize with SitecoreAI"
author: "Dylan Young"
pubDate: 2025-12-10
description: "Copy-paste custom conditions for Sitecore Personalize to supercharge SitecoreAI personalization."
authorImage: "../../assets/authors/dylan-young.jpg"
authorUrl: "https://www.linkedin.com/in/dylanyoung/"
socialImage: "../../assets/2025/five-simple-conditions-for-sitecore-personalize-with-sitecoreai/social.png"
---

![Launch Faster: 5 Simple Conditions for Sitecore Personalize with SitecoreAI Hero](../../assets/2025/five-simple-conditions-for-sitecore-personalize-with-sitecoreai/hero.png)

Welcome! Today I'm sharing five easy-to-create conditions for Sitecore Personalize. If you're unfamiliar with Conditions in Sitecore, think of them as similar to Sitecore XP rules—or if you're new to XP, think of them as small JavaScript snippets that access your guest profile in Sitecore Personalize or CDP. Based on the parameters you set, these conditions allow certain events or actions to occur. If you only have Sitecore Personalize, you can attach these (or a subset) to an Experience or Experiment. Where they become truly powerful is when you have both SitecoreAI and Sitecore Personalize (or eventually just SitecoreAI once there is feature parity). I consider building custom conditions like those described in this blog a great first step when you have both products. Why? Because they automatically become available alongside the out-of-the-box conditions in SitecoreAI. You can unlock more advanced personalization options with very little effort.

Let's get started. The conditions below begin with the easiest to implement. A few on this list require additional data capture—like capturing the page query string or custom events based on your specific needs.

## 1. Returning User in the Last x Days

Our first condition extends the out-of-the-box (OOTB) condition that comes with Sitecore. The standard condition checks whether a user is new or returning—helpful, but limited. This enhanced version adds a time dimension, letting you check if a user has returned within a specific number of days. The condition uses your Personalize tenant's system timezone and accepts two parameters: a number representing the days threshold, and a "has" or "has not" toggle. This toggle lets you configure opposite scenarios. For example, you can match customers who returned more than 30 days ago, or those who returned within the last 30 days—both scenarios work with this enum-like value.

```js
(function () {
  load("classpath:moment.js");
  load("classpath:moment-timezone.js");

  var daysParam = "[[Days | number | 30 | { required: true, min: 1 }]]";
  var hasVisited =
    "[[has or has not | enum(has, has not) | has | { required: true }]]";
  var timeZone = tenant.configurations.timeZone || "UTC";
  var currentDate = moment().tz(timeZone);
  var pastDate = currentDate.clone().subtract(daysParam, "days");
  var visitedWithinTimeframe = false;

  if (guest && guest.sessions && guest.sessions.length > 1) {
    for (var i = 1; i < guest.sessions.length; i++) {
      if (guest.sessions[i] && guest.sessions[i].startedAt) {
        var sessionStart = moment(guest.sessions[i].startedAt).tz(timeZone);
        if (sessionStart.isAfter(pastDate)) {
          visitedWithinTimeframe = true;
          break;
        }
      }
    }
  }

  return (
    (hasVisited === "has" && visitedWithinTimeframe) ||
    (hasVisited === "has not" && !visitedWithinTimeframe)
  );
})();
```

## 2. Custom QueryString Key Value Pairs

This condition addresses a scenario I see requested constantly. Sitecore's out-of-the-box (OOTB) conditions include a way to check for UTM tracking codes in the query string, but what if you have custom name/value attributes you want to check for? This custom condition also shows how you can add an input parameter to look up the `scope` of where that data should come from. Note that this condition requires an update to the data you're capturing. You'll need to update your Page View event to track additional arbitrary data (i.e., include the page's query string information) so you can use that information to check for the key and its values.

```js
(function () {
  var queryStringKey = "[[querystring key | string | | { required: true }]]";
  var queryStringValue =
    "[[querystring value | string | | { required: true }]]";
  var sessionScope =
    "[[session scope | enum(current, prior) | current | { required: true }]]";
  var matchFound = false;

  if (guest && guest.sessions && guest.sessions.length > 0) {
    var sessionsToCheck =
      sessionScope === "current" ? [guest.sessions[0]] : guest.sessions;

    for (var i = 0; i < sessionsToCheck.length; i++) {
      var session = sessionsToCheck[i];
      if (session && session.events) {
        for (var j = 0; j < session.events.length; j++) {
          var event = session.events[j];
          if (
            event.channel === "WEB" &&
            event.arbitraryData &&
            event.arbitraryData.ext
          ) {
            var pageData = event.arbitraryData.ext;

            if (pageData[queryStringKey] === queryStringValue) {
              matchFound = true;
              break;
            }
          }
        }
      }
      if (matchFound) {
        break;
      }
    }
  }

  return matchFound;
})();
```

This condition is unique because it examines both the session scope parameter and the collected key/value pairs. You could incorporate this scope parameter into all your conditions if you want to check all sessions rather than just the most recent one.

The rest of this condition works as described above—you'll need to store the query string information in arbitrary data for a page view event. I have it stored under an additional `ext` property, but you don't necessarily need to. This condition assumes your capture code splits the query string and creates an attribute for each key with its corresponding value. Once stored, the condition checks those values to confirm a match.

## 3. User Location - City

SitecoreAI already offers several location-based personalization options, including country, region, and state. This condition lets you target by city. Keep in mind that SitecoreAI conditions have limitations on the number of variants and conditions you can use on any given page. This rule may only be practical if you're targeting a specific geographic location with tailored advertising. However, if you use the `is vs is not` toggle combined with a comma-separated list of cities, this should work for many situations.

This condition looks in several places to find your city. One of the most interesting sources is the request headers. Because Sitecore Personalize conditions run server-side, there's a Cloudflare layer that provides several headers to assist with personalization. In this case, we're using `cf-ipcity`, but there are many more options:

- cf-ipcountry
- cf-postal-code
- cf-timezone
- true-client-ip
- cf-connecting-ip
- cf-iplatitude
- cf-region-code
- cf-iplongitude
- cf-region

In the future, I'll create more content on setting up other geo-location based rules. Below is the condition logic for city-based personalization.

```js
(function () {
  var visited =
    "[[is | enum(is, is not) | is | { required: true, values: [is, is not] }]]";
  var cityInput = "[[city | string | | { required: true }]]";
  var citiesArray = cityInput.split(",");
  var expectedType = "WEB";
  var expectedStatus = "OPEN";
  var cityMatch = false;

  if (
    request &&
    request.params &&
    request.params.geo &&
    request.params.geo.city
  ) {
    if (citiesArray.indexOf(request.params.geo.city) > -1) {
      cityMatch = citiesArray.indexOf(request.params.geo.city) > -1;
    }
  } else if (
    request &&
    request.requestDetails &&
    request.requestDetails.headers &&
    request.requestDetails.headers["cf-ipcity"]
  ) {
    if (citiesArray.indexOf(request.requestDetails.headers["cf-ipcity"]) > -1) {
      cityMatch =
        citiesArray.indexOf(request.requestDetails.headers["cf-ipcity"]) > -1;
    }
  } else if (guest && guest.sessions && guest.sessions.length > 0) {
    loop: for (var i = 0; i < guest.sessions.length; i++) {
      if (guest.sessions[i]) {
        if (
          guest.sessions[i].sessionType !== expectedType ||
          guest.sessions[i].status !== expectedStatus
        ) {
          continue loop;
        } else if (guest.sessions[i].dataExtensions) {
          for (var j = 0; j < guest.sessions[i].dataExtensions.length; j++) {
            if (
              guest.sessions[i].dataExtensions[j].key &&
              guest.sessions[i].dataExtensions[j].key === "bxt"
            ) {
              if (
                guest.sessions[i].dataExtensions[j].values &&
                guest.sessions[i].dataExtensions[j].values.geoLocationCity
              ) {
                if (
                  citiesArray.indexOf(
                    guest.sessions[i].dataExtensions[j].values
                      .geoLocationCountry
                  ) > -1
                ) {
                  cityMatch =
                    citiesArray.indexOf(
                      guest.sessions[i].dataExtensions[j].values.geoLocationCity
                    ) > -1;
                  if (cityMatch) {
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return (
    (visited === "is" && cityMatch) || (visited === "is not" && !cityMatch)
  );
})();
```

## 4. Custom Event

A powerful custom condition is the ability to look up any custom event in the current session (or in both current and past sessions if you extend this condition) and check for a specific value. This assumes you've customized the out-of-the-box Cloud SDK for SitecoreAI (either Content SDK or JSS). For example, you might want to track a custom event whenever someone clicks the `Play` button on a video. Or if a user watches a video, you could log or accumulate the total play time. Then, in a custom condition, you can check these values and display personalization based on the user's engagement level.

This opens up two possibilities: one condition that returns true or false based on whether the event was triggered, and another that searches arbitrary data for a specific value tied to that custom event.

### Just Looking for the Event

```js
(function () {
  var eventType = "[[event type | string | | { required: true }]]";
  var eventMatch = false;

  if (guest && guest.sessions && guest.sessions.length > 0) {
    var mostRecentSession = guest.sessions[0];
    if (mostRecentSession && mostRecentSession.events) {
      for (var j = 0; j < mostRecentSession.events.length; j++) {
        var currentEvent = mostRecentSession.events[j];
        if (currentEvent.type === eventType) {
          eventMatch = true;
          break;
        }
      }
    }
  }

  return eventMatch;
})();
```

### Event + Arbitrary Data

```js
(function () {
  var eventType = "[[event type | string | | { required: true }]]";
  var eventValue = "[[event value | string | | { required: true }]]";
  var comparisonType =
    "[[comparison type | enum(equals, less than, greater than) | equals | { required: true }]]";

  var eventMatch = false;

  if (guest && guest.sessions && guest.sessions.length > 0) {
    for (var i = 0; i < guest.sessions.length; i++) {
      var currentSession = guest.sessions[i];
      if (currentSession && currentSession.events) {
        for (var j = 0; j < currentSession.events.length; j++) {
          var currentEvent = currentSession.events[j];
          if (
            currentEvent.type === eventType &&
            currentEvent.arbitraryData &&
            currentEvent.arbitraryData.time_watched
          ) {
            var timeWatched = currentEvent.arbitraryData["time_watched"];
            if (
              (comparisonType === "equals" && timeWatched === eventValue) ||
              (comparisonType === "less than" && timeWatched < eventValue) ||
              (comparisonType === "greater than" && timeWatched > eventValue)
            ) {
              eventMatch = true;
              break;
            }
          }
        }
      }
      if (eventMatch) {
        break;
      }
    }
  }

  return eventMatch;
})();
```

You could make this condition more dynamic by making the arbitrary key dynamic as well, but you get the idea.

## When Specific Date Has Passed

This condition reminds me of one of the XP rules I saw used most frequently in a customer's implementation years ago. It wasn't really about personalizing based on the user—it was more about using personalization capabilities to schedule content for different parts of the site. There are much better ways to handle this now without using personalization rules or conditions. And with the limitations on the number of conditions per variant and the number of variants per page, I'm not sure this would be a practical approach either. But just in case you have a one-off scenario where you might combine this with another condition that's more user-targeted, I've provided the example just in case you really want it.

```js
(function () {
  load("classpath:moment.js");
  load("classpath:moment-timezone.js");
  var timeZone = tenant.configurations.timeZone || "UTC";

  var dateInput =
    "[[date | string | | { required: true, placeholder: mm-dd-yyyy }]]";
  var hasOrHasNot = "[[has | enum(has, has not) | has | { required: true }]]";

  var serverTime = moment().tz(timeZone);
  var inputDate = moment.tz(dateInput, "MM-DD-YYYY", timeZone);

  var dateHasPassed = serverTime.isAfter(inputDate);

  return (
    (hasOrHasNot === "has" && dateHasPassed) ||
    (hasOrHasNot === "has not" && !dateHasPassed)
  );
})();
```

## Wrap Up

As you can see from these five custom conditions, you can do a lot with conditions. Their real power emerges when you combine more than one on a specific variant. Understanding the basics of writing conditions is essential—I highly recommend reading my blog on debugging conditions: [Tips to Debugging Conditions in Sitecore Personalize](https://dylanyoung.dev/insights/tips-to-debugging-conditions-in-sitecore-personalize/). As you begin testing conditions, it's a great idea to create a Guest Profile specifically for testing. When you run a test, you can select an existing guest (actually, from what I can tell, you must select an existing guest from your Personalize tenant) and then customize that guest profile for whatever you're trying to test. This can make a world of difference as you continue building more conditions.

<!-- markdownlint-disable MD033 -->
<aside class="about-the-author">
  Dylan Young currently works at <a href="https://www.velir.com/" target="_blank">Velir</a> as a Solutions Architect (2025) and is a <a href="https://mvp.sitecore.com/en/Directory/Profile?id=367eebbf510647a7fc2108dc96c17a53" target="_blank">six-time Sitecore Technology MVP</a>. He has worked for Sitecore, partners, and customers, bringing over a decade of experience with the platform. In his free time, he enjoys contributing to <a href="https://dylanyoung.dev/" target="_blank">his blog</a> and <a href="https://www.youtube.com/@dylanyoungdev" target="_blank">YouTube channel</a>, creating unique content focused on Sitecore Personalization and Content.
</aside>
<!-- markdownlint-enable MD033 -->
