# Future Template Recommendations

This document proposes next templates for tiny.garden based on:
- current template coverage (`blog`, `portfolio`, `gallery`, `timeline`, `document`, `homepage`, `feed`, `shop`, `slideshow`, `presentation`, `campaign`, `feature-requests`, `blank`)
- user demand captured in feature requests
- likely customer segments for Are.na-powered publishing

## Recommended templates (prioritized)

| Priority | Template concept | Who would use it | Company types | Why it is a good fit |
| --- | --- | --- | --- | --- |
| High | **Link in Bio** | Creators, artists, founders, indie hackers, musicians | Creator businesses, solo studios, personal brands | Fastest "publish and share" use case. Converts one Are.na channel into a mobile-first profile page with key links. |
| High | **Map / Places** | Researchers, travel writers, urbanists, photographers, event organizers | Research labs, media projects, tourism orgs, cultural orgs | Converts location-rich blocks into an interactive map + list view; unique versus standard site builders. |
| High | **Photography Story** | Photographers, photo editors, documentary creators | Photography studios, magazines, visual agencies | Supports image sequences, EXIF/caption emphasis, and copyright metadata for portfolio + editorial storytelling. |
| High | **Case Study / Project Breakdown** | Designers, product teams, agencies | Design studios, software agencies, consultancies | Structured narrative template for challenge → process → outcome; ideal for converting mixed Are.na research into client-facing stories. |
| Medium | **Directory / Resource Library** | Curators, educators, niche community builders | Media companies, nonprofits, communities | Turns channels into filterable collections (tags/categories), a common high-value use case for knowledge curation. |
| Medium | **Changelog / Product Updates** | Builders shipping frequently | SaaS startups, open-source teams, product teams | Date-first update stream with version markers and callouts; improves communication for active products. |
| Medium | **Event / Conference Microsite** | Organizers, collectives, schools | Conferences, meetups, art spaces, universities | Supports schedule, speakers, venue/map, sponsor sections from one channel; useful recurring commercial use case. |
| Medium | **Team / Studio Profile** | Small teams and collectives | Agencies, creative studios, nonprofit teams | About + people + work links layout for groups that do not need a full corporate site. |
| Low | **Course / Syllabus** | Teachers, workshop hosts, learning communities | Schools, bootcamps, training orgs | Module-based layout with lesson resources and progression; good for text/link/media channels. |
| Low | **Press Kit / Media Room** | Founders, artists launching projects | Startups, labels, publishers | Download-ready assets, boilerplate text, logos, and contact blocks in one place. |

## Existing feature requests already aligned

These requests are already present in `docs/feature-reviews.md` and should inform template roadmap order:

1. **Template: Link in Bio**
2. **Template: Map**
3. **Template: Photography**

Recommendation: ship these three first as a "requested templates pack," then continue with Case Study and Directory.

## Suggested rollout strategy

1. **Pack A (highest demand):** Link in Bio, Map, Photography  
2. **Pack B (business utility):** Case Study, Directory, Changelog  
3. **Pack C (vertical expansion):** Event, Team Profile, Course, Press Kit

## Audience segmentation summary

- **Creators / individuals:** Link in Bio, Photography, Press Kit
- **Studios / agencies:** Portfolio (existing), Case Study, Team Profile
- **Startups / product teams:** Changelog, Homepage (existing), Campaign (existing)
- **Communities / nonprofits / education:** Directory, Event, Course, Document (existing)

## Notes for future scoring

To decide what ships next, score each concept by:
- request volume (from feature board)
- implementation complexity (new block handling vs. presentation-only changes)
- monetization potential (who is likely to upgrade for this template)
- differentiation (how unique it feels compared with generic site builders)
