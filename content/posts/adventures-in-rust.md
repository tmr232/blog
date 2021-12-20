---
title: Adventures in Rust
published: true
description: A tale of my time in Rust-land
# tags: rust, beginners
date: 2018-04-27
---

In the few years since Rust came out, I've frequently found myself explaining what an amazing language Rust is. Laying out the ways in which it is going to change the systems-programming world, and what a pleasure Rust is to code in.

A few months back, I finally got around to trying it out. It was horrid. The darned borrow-checker just wouldn't let me do anything. I couldn't get anything meaningful to compile. Despite years of programming in various languages I felt completely incompetent to handle it. I resolved to drop Rust and focus on other things.

Despite my initial disappointment and discouragement, I still could not get Rust out of my head. Its premise is too promising to put down after one go. Besides, I cannot be beaten by a programming language! And yet, it can wait. It is too much work for now. Some day, maybe in a few years, I'll write Rust.

Using Rust, however, is a completely different experience. Rust tools are absolutely amazing. As a Windows user through-and-through I got used to open-source tools (especially command line tools) not being supported on Windows. (No, cygwin is not a valid solution.) I don't blame the devs - they work on Linux. Even if they have the time to spend on the Windows port, they don't necessarily have a Windows machine to test it on. And yet - I am used to being disappointed. That is why, when I first heard of [`rg`][1](an amazing `grep` replacement) and [`fd`][2](an amazing `find` replacement) I *knew* that they would not work on Windows. But, being my optimistic self - I checked. And a good thing I did that.

To install Rust tools, the easiest way is to install the Rust toolset and compile them. A daunting task in every other language, yet a breeze in Rust. 

1. Head over to [rustup.rs][3] and install Rust
   (A single command-line on Linux, a single executable on Windows)
2. `cargo install ripgrep fd-find`
3. That's it. Really. Now use the tools.

This was when I realized how amazing Rust really is. Even if you ignore the language completely - it's tooling and package management is unparalleled. Having published Python packages in the past, I was amazed at the simple publishing and installation mechanisms. Having used C and C++ I was simply amazed at a systems-programming with package management. So while still somewhat scared of the borrow-checker, I decided that my next CLI tool will be written in Rust. The easy-as-pie deployment bought be over completely.

Some months after that, I finally found myself in need of a new CLI tool. I was faced with a continuous log I wanted to filter for duplicates. `sort -u` sorts, so it cannot work on streams. Of course, there is probably some `sed` or `awk` magic I can use, but I want something simple. Besides, a tool that filters out duplicates seems like the perfect beginner project for getting hands-on with Rust. So I went ahead and creates [`uq`][4]. After finishing it, I published it on [crates.io][5]. `cargo install uq` on a second machine, and it worked. Both Windows and Linux. A friend tried it, and it simply worked! I never had such a pleasant deployment experience. It is practically easier to install from source then send a compiled binary! And it works cross-platform out of the box.

A short while later I wanted to group some log entries by a regex. I looked around and could not find a simple way to do it. So, once again, I turned to Rust. Some borrow-checker-wrestling later and the first version of [`groupby`][6] was complete. Yay!

A short time later I had one of the best open-source experiences I've ever had. Someone started using `groupby`, looked at my terrible code, and posted this issue:

{% github https://github.com/lostutils/groupby/issues/1 %}

Having someone more experienced in Rust come in and help me improve my very naïve code was great. And it was my first time getting a "this is great, may I help you?" comment and not a "this is great, I want this as well" one.

For the time being, I keep spending more time wrestling the borrow-checker than writing actual code in Rust. But I am (almost) sure it is due to lack of experience. On the plus-side, I'm becoming better at detecting lifetime issues in other languages as well.

So, for anyone who hasn't done it yet, I highly recommend using Rust-based tools. Just for the amazing experience of things working (and compiling!) out of the box. Later, if you choose to actually code in it, be sure to brace yourself for a somewhat bumpy ride. Friends tell me that after a time Rust becomes easier, speeding up their development. I'm not there yet, but I'm working on it.



[1]: https://github.com/BurntSushi/ripgrep
[2]: https://github.com/sharkdp/fd
[3]: https://rustup.rs/
[4]: https://crates.io/crates/uq
[5]: https://crates.io/
[6]: https://crates.io/crates/groupby