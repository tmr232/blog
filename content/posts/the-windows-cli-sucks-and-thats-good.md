---
title: The Windows CLI sucks, and that's good.
published: true
description: 
# tags: rant, shell
date: 2017-05-01
---

## TL;DR

Windows' shell sucks so people write tools. Tools are fun to use.

Linux's shell is amazing so people write terrible bash scripts and makefiles.

Be sensible. Use Python. Use C.

The rest of the post is me ranting, letting off some steam. Have fun, and don't take it too seriously.


## :turtle: A Story of Shells :turtle:

```bash
my_var=$(application arg0 arg1)

for /f %%i in ('application arg0 arg1') do set my_var=%%i
```
### :window: Windows :window:

I've been a Windows user for a very long time. In fact, it has always been my main OS. And I absolutely love it. That is not to say, though, that there aren't issues with that. One such thing is the CLI.

For years, the only thing we had on Windows was `cmd.exe` and `.bat` files. And they are ghastly. They are pretty straight-forward for very simple things, but try using them for anything more advanced (like [setting a variable to the output of a command](http://stackoverflow.com/questions/2323292/windows-batch-assign-output-of-a-program-to-a-variable)) and you'll quickly realize that this is not the tool for you. You need a *real* programming language. So you'll use Python, or C, or something.
It will take you a bit longer to write the tool you needed, but in the process it will become an actual tool and not an annoying script.

In recent years there has been some serious improvements - PowerShell came along, [cmder](http://cmder.net/) made the shell look a bit better, and I have some Linux tools (grep, awk, xargs...) running in my Windows shell. And yet, people tend to use more general purpose languages on Windows.


### :penguin: Penguins :penguin:

On Linux, however, things have always been good with the shell. It has awesome terminals, and a huge amount of utilities that can be chained (piped) to unleash powers beyond imagination. And unlike Windows, where you need to use funny-looking APIs to get information, Linux just gives you everything in handy text files.

In fact, Linux is optimized for the shell in ways that make me wince. It is actually easier to parse system information (like, say, a process list) in the shell than in C code. Because instead of proper APIs, we have text files. *Text* files. The kernel takes binary data, formats it into strings, and the user-mode code can then `scanf` the code back into binary data. Amazing!

But enough of that.

The Linux shell is truly remarkable. You can do pretty much anything in a bash script. And people do.
Now, there's a bit of Linux philosophy that I really like. "Do one thing and do it well." `find` finds things, `grep` greps, `xargs` xargs, and `awk` awks. So far - so good. But what about bash itself?
While each of the shell utilities does one thing and does it well, bash, and especially bash scripts, do not. They allow you to quickly implement advanced behaviours by hacking together multiple commands. You write more and more and more, and everything just works. And then, it doesn't. And you need to fix it. If you're lucky, and the code is well documented you might get away with that. But more often than not, it won't be. And the wonderful "let's take strings and pass them around" programming style might come back to bite you.

But, again, bash is fantastic for quick hacks. And works fairly well in general when you're not taking input parameters, and when it's small enough. I don't like it, but it works.

## :fire: Make Your Own Hell :fire:

The real issue is `make`.

`make` is a beast spawned in the deepest dungeons of hell (and I am awfully sorry if I offended any such beast by the comparison.)
Makefiles give you the benefits of never leaving your shell / code-editor while you work. You just create a makefile, define your targets, and you're good to go. In truth - that is fantastic. You can even include bash scripts in your makefiles to do custom steps. Or generate makefiles. Or use `automake`. Or anything else that might make the task of writing makefiles easier to do and harder to maintain. But you write, and you specify, and it just works! Most of the time.

** **Dramatic Pause** **

You might have noticed I don't like `make`. That's true. This post is mainly me complaining about `make` and blowing off some steam. Now, I appreciate `make`. I've used it to build things that I never would've managed on Windows. It's an extremely powerful tool. But, you see, as a Windows user, I naturally enjoy IDEs. One such wonderful creation is Visual Studio. As far as C/C++ development tools go it is unparalleled. "But wait!" say my Linux friends, "VS forces you to create foul 'projects' using their fiendish 'GUI'! In Linux, we just write makefiles!"
That is true, and it is quite annoying with small projects (where I usually end up having a `.bat` file to trigger the build with all the relevant flags,) but it is godsend for anything more complex. You have GUI, and Projects, and Solutions and whatnot. It's great. A bit slow to define, but oh so easy to use!

And now, after I lost most of my Linux-oriented readers, I can get to the point. Linux has a super-powerful shell, so people use it to make a super-powerful mess. Windows has a super-useless shell, so people don't use it. Instead - they build tools! User-friendly(-ish) tools with GUI. And they use general purpose programming languages. And that's good.


## :pizza: Takeaway :pizza:
Should you stop using bash? Or cripple it? Or keep Windows' shell down? Hell no!

Use whatever tools you deem fit. But use them wisely. Keep shell-scripting to small automation tasks, and try to use more maintainable programming languages when you write something larger or more complex. And do write new tools. Tools are fun.