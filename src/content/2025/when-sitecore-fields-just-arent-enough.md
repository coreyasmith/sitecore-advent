---
title: "When Sitecore Fields Just Aren't Enough"
author: "Nona Dzhurkova"
pubDate: 2025-12-21
description: "Simplify Sitecore templates with a hybrid data architecture for dynamic product comparisons."
authorImage: "../../assets/authors/nona-dzhurkova.jpg"
authorUrl: "https://www.linkedin.com/in/nona-dzhurkova-3221b812/"
socialImage: "../../assets/2025/when-sitecore-fields-just-arent-enough/social.png"
---

![When Sitecore Fields Just Aren't Enough Hero](../../assets/2025/when-sitecore-fields-just-arent-enough/hero.png)

I worked on many projects over the years, and one thing I learned is: keep it simple. I like challenges, I'm excited to find simple and elegant solutions—this is what makes me excited. Sitecore is really good at handling data, but sometimes it falls short with fields and templates. What I'm about to show you might look complex at first, but it's actually elegant and much easier to maintain than you'd think.

Picture this: You're 6 months into a project. The client wants to compare products. You add product attributes as fields to the template. Then the client says, "I have another group of products which I want to compare, they have different attributes." Then another site needs different fields. Before you know it, you have 15 different product templates, 200+ custom fields, code that breaks every time you add a field, editors who can't figure out which template to use, and developers who dread template changes.

Sound familiar? I've seen this way of implementation. And I found a way out.

## The Breakthrough: Hybrid Data Architecture

What if there's a way to keep Sitecore templates simple, handle unlimited comparison attributes, add new comparison types without code changes, cache everything intelligently, and make editors happy? The secret is hybrid data architecture - combining Sitecore's content management with file-based dynamic data.

Instead of using Sitecore fields for everything, this approach stores comparison info in files like CSV or Excel and links them to groups - set of comparable products. Each set of comparable products have their attributes in single file. The link between product and excel row is done by Alias field - field on product template and first column in excel.

Here's how our file will look:

```text
Alias,ScreenSize,Battery,Camera,RAM,Storage,StorageType,Processor,Graphics,Weight,Dimensions,OS,HasSSD,Ports,Wireless
ND100,6.2",4000mAh,50MP,8GB,128GB,UFS 4.0,Exynos 2400,Adreno 750,168g,147x70x7.6mm,Android 14,Yes,USB-C,Bluetooth 5.3
ND101,6.3",4350mAh,48MP,8GB,256GB,UFS 4.0,A18 Pro,Apple GPU,194g,147x71x7.8mm,iOS 18,Yes,Lightning,Bluetooth 5.3
ND102,6.1",4700mAh,50MP,12GB,256GB,UFS 4.0,Tensor G4,Mali-G715,185g,150x72x8.2mm,Android 14,Yes,USB-C,Bluetooth 5.3
ND103,14",56Wh,1080p Webcam,16GB,512GB,SSD,i7-1360P,Iris Xe,1.4kg,312x217x15mm,Windows 11,Yes,Thunderbolt 4,Bluetooth 5.2
ND104,13.3",50Wh,720p Webcam,8GB,256GB,SSD,Ryzen 7 7840U,Radeon 780M,1.3kg,300x210x14mm,Windows 11,Yes,USB-C,Bluetooth 5.3
ND105,15.6",70Wh,1080p Webcam,32GB,1TB,SSD,i9-14900H,RTX 4070,2.2kg,360x245x20mm,Windows 11,Yes,HDMI,Bluetooth 5.4
```

A link to a specific section of a site should be easy to share. This common expectation is mostly overlooked by developers. So we've build our comparison component to use URL query strings— comparison group name and products to compare. But then how to get data? The component gets the data from our internal API which will process the excel file into correct format and will return JSON data for the comparison table.

This setup is easy and can be extended. Imagine visitors select 3 products but we have 3 more in the same comparable set of products - we can show a related products section with the rest of the data that is in the same file. We can even extend the PDP with an additional section showing dynamic product attributes! Smart, right?

## The Architecture That Makes the Difference

Our project is build on SitecoreAI with Next.js and is hosted on Vercel, I cannot give details but we are architecting it from the beginning in mind to host huge amount of sites in the monorepo. This is a big challenge, you probably knows that is totally different when you are not using multisite middleware. So we are making it flexible.

The comparison flow starts from the product listing page which shows results from Sitecore Search. When compare button is pressed, the URL is generated with a link to the comparison page, containing group and selected products as query string parameters, like this one: <http://localhost:3000/?group=NDBestGroup&products=CND01,CND02>

The comparison component in our Next.js headless app reads the query string parameters and calls our API.

The API combines product details like title, image, and SKU with dynamic properties from the comparison file.

The setup is simple: product pages have an alias field and comparison group. The group itself contain links to Excel file with product attributes, one of them is the alias.

The group name is critical because it determines which Excel file to read for the comparison attributes.
The product alias is critical because it needs to match a row in excel.

What about all of the data we have and how the performance is? The answer is Vercel data cache.
The first cache is the data for comparison groups. With single GraphQL call we store groups in the cache.
The next GraphQL call is to retrieve all product information for this specific set of products assigned to that group.

We check our caches first—if we already have all the requested products cached, we skip the GraphQL call. If there's a cache miss, we make a GraphQL call to get all product data from Sitecore and store it in cache. Then we process the Excel file based on the group name—if we have it in cache, we read it; if not, we cache it and get the comparison attributes. The rest is just simple mapping of product data and custom attributes

GraphQL calls are expensive, we only make them when we don't have the data. Product data stays fresh because we cache the actual Sitecore data, not just the comparison attributes.

The result is that editors can update Excel files with new comparison attributes, and the system picks up the changes automatically. Product data comes from Sitecore, comparison attributes from Excel, and everything is cached smartly. The invalidation logic is sophisticated but elegant—using tag-based revalidation to target specific cache entries when data changes, making the whole thing fast and reliable.

## The Caching Magic

The caching is most important in every project . For production environments, we use Vercel's `unstable_cache` with a configurable revalidation period, we also implemented tags so we can revalidate by tags when data is updated.When in local context where Vercel's cache isn't available, we fall back to an in-memory cache with a 1-minute TTL, usually for development purposes and simulate caching.

The real magic happens with tag-based revalidation. We tag our cached data with labels like 'product-comparison', 'products-by-group', and 'comparison-groups'. When editors make changes, we can invalidate specific cache entries by tag instead of waiting for natural expiration. This means fresh data gets served immediately when we know something changed, but we still get the performance benefits of caching when nothing has changed.

Cache keys are generated using base64 encoding to hide parameter values in logs, so sensitive data doesn't show up in cache logs while keeping unique keys for different comparison sets. The system automatically detects the runtime environment—localhost and development use in-memory cache, edge runtime uses in-memory cache, and production uses Vercel's `unstable_cache`.

Each cache operation includes timing logs to monitor performance. Cache hits are logged with execution time, cache misses trigger GraphQL calls with timing, and errors are logged without exposing sensitive data. This dual-cache approach makes sure the comparison system works reliably across all environments while keeping optimal performance.

## The Results That Matter

In Sitecore, keeping things easy is a win. Using files for structured data isn't right for everything—it probably fits maybe 1% of cases—but when it fits, it solves issues. It's a good mix of easy to change and maintain, great for projects where things change fast.

The good parts are that templates stay easy and reusable, it's cheaper to make and maintain, editors can do their job without things getting too hard, and it works well across many sites and product types.
The bad parts are that there's no file validation inside Sitecore, so you need to do it in the code, naming and linking have to be done right—the alias field needs to match the row in Excel, and files need to be changed by hand (as of now).

The file approach works best when data is changed and updated occasionally and there's a need to work across many sites or types. For product comparison parts, this approach kept the system easy to extend without any customizations or code changes, fast, and friendly to editors—no need for a ton of product templates.

## Beyond Product Comparison

This approach works for different comparisons (pricing, features), team member profiles (skills, experience, certifications), event listings (dates, venues, pricing), and resource (documents, categories, metadata). The possibilities are endless when you separate content from comparison data.

The breakthrough isn’t really about product comparison at all — it’s about how we think about structured data in Sitecore. Once you stop forcing everything into templates and start treating data as flexible, dynamic and reusable, Sitecore becomes simpler, faster, and far more scalable. That’s where the real power is.

<!-- markdownlint-disable MD033 -->
<aside class="about-the-author">
  Nona Dzhurkova is a <a href="https://mvp.sitecore.com/en/Directory/Profile?id=cf538c8b50d842b8884808dabafa2fdd" target="_blank">Sitecore Technology MVP</a> and experienced Sitecore developer with over a decade of hands-on experience in XM, XP, SXA, and SitecoreAI. She specializes in building scalable solutions, managing migrations and upgrades, optimizing performance, and implementing modern front-end approaches using frameworks like Next.js. Known for her problem-solving skills, she has tackled complex challenges in Sitecore architecture, security, and integration projects. Nona is an active contributor to the Sitecore community, speaking at events, hosting workshops, and mentoring other developers. She is driven by curiosity, continuous learning, and a passion for delivering high-quality digital experiences across enterprise environments. Outside of work, she explores emerging technologies and enjoys sharing knowledge to help the Sitecore ecosystem grow.
</aside>
<!-- markdownlint-enable MD033 -->
