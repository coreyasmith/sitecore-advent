---
title: "How to Expose Sitecore Rich Text Field Values Properly in Your Custom APIs"
author: "Peter Prochazka"
pubDate: 2025-12-16
description: "Fix broken Rich Text links in custom Sitecore APIs with the renderField pipeline solution."
authorImage: "../../assets/authors/peter-prochazka.jpg"
authorUrl: "https://www.linkedin.com/in/chorpo"
socialImage: "../../assets/2025/rich-text-field-values-in-custom-apis/social.png"
---

![How to Expose Sitecore Rich Text Field Values Properly in Your Custom APIs Hero](../../assets/2025/rich-text-field-values-in-custom-apis/hero.png)

There is always a thin line between requirements and real implementation. My colleague received a user story to implement simple API on top of Sitecore which would expose some values from Rich Text fields combined together so other sites could consume it and expose results. This would be handy as content editors could create and maintain one set of terms and conditions in one place (site) instead of copy pasting  them through various sites which were hosted on Sitecore on various machines (VMs, AKS pods, ...).

## Problem

The implementation was done but after it was pushed to Production, those connected sites started to complain about the solution. Until the Rich text field values were just simple enhanced textual values, all was good... When Content Editors started to add more "advanced" features like links, the solution started to be problematic as links could not be used at all.

Sitecore by default stores links in Rich Text fields as relative links with a weird but understandable notation `~/link.aspx?_id=$ItemID$` so it can maintain original Item ID and therefore generate always relative link like this:

```html
<a href="~/link.aspx?_id=0FD536F74B2340DF826EC71D3488D45A&amp;_z=z">about-us</a>
```

This is of course unusable for Content editors and also for SEO gurus.

Problematic was the implementation which was working for simple texts but not for links as described above:

`item.Fields[Constants.AccordionModule.AccordionSection.Fields.TermsAndConditions1]?.Value`

## Solution

Solution was pretty simple, we have disassembled some Sitecore dlls as usually and created this method:

```csharp
private string RenderRichTextField(Item item, string fieldName)
{
    var field = item.Fields[fieldName];

    var args = new RenderFieldArgs(true)
    {
        After = string.Empty,
        Before = string.Empty,
        EnclosingTag = string.Empty,
        Item = field.Item,
        FieldName = field.Name,
        Format = string.Empty,
        Parameters = new SafeDictionary<string>(),
        RawParameters = string.Empty,
        RenderParameters = new SafeDictionary<string>(),
        DisableWebEdit = true,
        DisableWebEditContentEditing = true,
    };

    var pipeline = CorePipelineFactory.GetPipeline("renderField", string.Empty);
    pipeline.Run(args);

    return $"{args.Result.FirstPart}{args.Result.LastPart}";
}
```

This code is doing nothing else then calling the usual pipeline to render fields within our API and renders links within Rich text fields properly.

To truly generate reusable links from this API next step is to add support for also adding server URL...

<!-- markdownlint-disable MD033 -->
<aside class="about-the-author">
  Peter is Sitecore solutions architect and <a href="https://mvp.sitecore.com/en/Directory/Profile?id=ff03091d310e4712e11108daa82b89d0" target="_blank">7 times Sitecore Technology MVP (2019-2025)</a>. He has almost 12 years of experience with Sitecore CMS Platform (DXP), Sitecore JavaScript Services (JSS), Sitecore Experience Accelerator (SXA), Sitecore Experience Commerce (SXC) and more than 20 years of experience with ASP.NET, ALM and other useful technologies. He has 2 bright sons and he likes running and reading books in his spare time.
</aside>
<!-- markdownlint-enable MD033 -->
