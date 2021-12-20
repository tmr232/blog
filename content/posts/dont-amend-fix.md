---
title: Don't Amend, Fix
published: true
description: A fun alternative to `git commit --amend`
cover_image: 
# tags: git
date: 2017-03-10
categories: ["git"]
---

As git users, we know that we should "commit early, commit often." While this is a wonderful thing to do, it does mean that from time to time we make a mistake and need to fix a commit. Maybe we forget to `git add` a new file, or missed a typo. So we go ahead and `git commit --amend`. Problem solved. Great.

But personally, I hate it.

For one thing, amending commits hides history. Once you amend, that past state is gone before you can properly test the new one. True, you can also restore it via `git reflog`, but no-one really likes using that. It should be a last resort.

For another thing, amending is very limited. Say I am writing some C code. I write my first module, add it and commit.


```bash
git add FirstModule.h
git commit -m "Added FirstModule"
```

I write my second module, and add it as well.


```bash
git add SecondModule.h SecondModule.c
git commit -m "Added SecondModule"
```

And now, after adding that second commit, I realize that I forgot to commit `FirstModule.c`. `git commit --amend` to the rescue? Not really. I now have to resort to the black, frightening voodoo magic called `git rebase`.

First, we commit the forgotten module

```bash
git add FirstModule.c
git commit -m "Added FirstModule.c, forgotten eariler."
```

And then rebase - `git rebase -i HEAD~3`

```
pick 1db8687 Added FirstModule
pick 336941b Added SecondModule
pick 7884909 Added FirstModule.c, forgotten eariler.
```
Change to

```
pick 1db8687 Added FirstModule
fixup 7884909 Added FirstModule.c, forgotten eariler.
pick 336941b Added SecondModule
```
Save & Quit, and we're done.

```
* 1946e37d105ffebcbd91bb958f8a2fce6160c761 (HEAD -> master) Added SecondModule
|  create mode 100644 SecondModule.c
|  create mode 100644 SecondModule.h
* 8ffbb9f2915e060a6c4771e13f5a82442743724c Added FirstModule
|  create mode 100644 FirstModule.c
|  create mode 100644 FirstModule.h
* 815e7bab6ee1fa5bf1df10f5705919b48cbe214c First Commit
```

Not that hard, is it?

But still, moving between amending and rebasing can be cumbersome. Especially as most of the time there is no real need to rebase and it's easy to forget the process. Enter `git commit --fixup` (or `--squash`) and `git rebase -i --autosquash`.

These commands save us the work of reordering the commits and changing from `pick` to `fixup` or `squash`. Making our rebasing work a lot easier.

I like defining the following aliases:

```ini
[alias]
    ri = rebase -i --autosquash
    mri = rebase -i
    fix = commit --fixup
    squ = commit --squash
```
Using those aliases, the rebasing we did earlier would work as follows:

```bash
git add FirstModule.c
git fix HEAD~1
git ri HEAD~3
```

We'd get the following rebase automatically

```
pick 1db8687 Added FirstModule
fixup 50a3650 fixup! Added FirstModule
pick 336941b Added SecondModule
```
Exit the editor, and be done with it.

We can use `fix` as many times as we want (just go ahead and `git fix HEAD -a`) before the rebase. Our log may look funny

```
* fe0c2a0 (HEAD -> master) fixup! fixup! fixup! fixup! Added SecondModule
* a53cd32 fixup! fixup! fixup! Added SecondModule
* 9c19f2d fixup! fixup! Added SecondModule
* b758a53 fixup! Added SecondModule
* 902d65e Added SecondModule
* 67f1260 Added FirstModule
* 815e7ba First Commit
```

But the rebase doesn't care

```
pick 902d65e Added SecondModule
fixup b758a53 fixup! Added SecondModule
fixup 9c19f2d fixup! fixup! Added SecondModule
fixup a53cd32 fixup! fixup! fixup! Added SecondModule
fixup fe0c2a0 fixup! fixup! fixup! fixup! Added SecondModule
```

## Conclusion
Stop using `git commit --amend` and start using `git fix` (`git commit --fixup`) instead. It is a no-fear, low-overhead alternative, and it far more flexible.
Here are the aliases again, in case you want them:

```ini
[alias]
    ri = rebase -i --autosquash
    mri = rebase -i
    fix = commit --fixup
    squ = commit --squash
```