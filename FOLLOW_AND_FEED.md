# Following + the Feed (Instagram-style)

Written Nov 15, 2026. Goes out **after 1.1** (build it from `main` once this is merged).
Nothing here touches the 1.0 build Apple is reviewing (`app-store-fixes`).

## What it does

- **Follow people.** Tap Follow on someone's profile, on a post, or in Find people.
  Your Profile now shows real Followers / Following numbers; tap them to see the lists.
- **Feed tab** (was "Share"). Stories stay at the top. Under them: posts from people you
  follow and your own, newest first. Pull down to refresh; it loads more as you scroll.
- **Posts.** The ⊕ button on Feed → New post. Post a saved outfit, a closet piece, or up to
  10 photos, with a caption. You can tag a piece you're selling, and it shows a shop button
  (title + price) that opens the listing.
- **Likes.** Tap the heart or double-tap the photo.
- **Profiles.** Tap a name to open that person's profile: photo, bio, counts, Follow button
  and a grid of their posts. "My posts" on your Profile opens your own.
- **Find people.** The person+ icon on Feed (or on Profile). Search by name or @username;
  with an empty search it suggests people who post.
- **Edit Profile now saves** name, @username, bio, website and a profile photo.
- **Safety (Apple requires this for user content):** every post has ••• → Report post /
  Unfollow / Block. Blocking removes the follow both ways and hides their posts. You can
  delete your own posts. Guests are asked to create an account before following or posting.

## Turn it on (Supabase, one time)

Supabase → SQL Editor → New query → open `supabase/v1_2_follow_and_feed.sql`, copy all of it,
paste, **Run**. It is safe to run again. Run it **after** the 1.1 SQL files.

Until that is run, the Feed shows a small note saying it is almost ready; nothing breaks.

No new secrets, no server functions to deploy, no new app permissions (it reuses photo library
and camera access that ModTok already asks for).

## Test it (two accounts)

1. Account A: Edit Profile → set a username → Done. Feed → ⊕ → New post → share an outfit.
2. Account B: Feed → person+ icon → search A's username → Follow.
3. Account B's Feed shows A's post. Like it; A's like count goes up.
4. Account A's Profile shows 1 follower.
5. Account B: ••• on the post → Block. The post disappears and the follow is removed.

## App Store notes for the update

- What's New: "Follow your friends and see their outfits in your new Feed. Post looks from
  your closet, like posts, and shop pieces tagged in them."
- App Privacy: no change in data types (profile name/photo and user content were already
  declared for Stories); check that "Photos or Videos" and "Other User Content" are listed.
