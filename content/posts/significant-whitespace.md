---
title: Significant Whitespace
published: true
date: 2023-01-14
---

All whitespace is significant.

It might not always matter to your computer, or compiler, or piece of code.
But to you, a human reading the code, it is significant.

I often here people complaining about significant whitespace. 
They say it makes no sense, that it makes working with the code harder.
That whitespace, specifically in code, should not be significant. 
But the unavoidable truth is that whitespace is always significant, regardless of the language you use.

## Whitespace Primer

Before we talk about its significance, we need to define what whitespace is.

We'll start with the [Wikipedia definition of a whitespace character][]:

> [...]  any character or series of characters that represent horizontal or vertical space in typography.
> When rendered, a whitespace character does not correspond to a visible mark, but typically does occupy an area on a page.

Next, we'll divide it into 2 categories - visible and invisible.

### Visible Whitespace

Visible whitespace is the whitespace you can _see_.
Indentation, spacing, line breaks... All of them make for visible whitespace.

```
The words in this line are separated by spaces.
    This line is indented using 4 spaces.
    
An empty line precedes this line!
```

### Invisible Whitespace

Invisible whitespace is all the whitespace you can't see.
This is not because it's using different characters, but because it is positioned where it does not directly move other characters.

```
This line ends with 4 spaces.    
There are 2 line breaks after this line.


```

Since you cannot see it, it's hard to make sense of it. 
This is the source of many complaints.

### Indistinguishable Whitespace

In addition to visible and invisible whitespace, there's another category.
Indistinguishable whitespace.

This category includes, for the most part, tabs and spaces.

```
    Here we indent with 4 spaces.
	Here we indent with a tab.
```

Since they look the same, but are not the same character, they cause many issues.



## Significance

There are 2 ways for whitespace to be significant. 
It can be human-significant, meaning that it is significant for the reader; and it can be machine-significant, meaning that it matters to the computer.

Most (if not all) whitespace complaints stem from disparity between those two concepts.
From cases where whitespace is human-significant and not machine-significant, or vice versa.

Going forward, we'll call situations where human- and machine-significance match "matched significance", and cases where they do not "mismatched significance".

Let's look at some examples.

### Matched Significance

#### Plain Text

```
This line has spaces it in.
Lines are separated by line breaks.
We can have     multiple spaces.


Or multiple line breaks.
```

With the exception of invisible whitespace (trailing spaces or line breaks), there is no mismatch.

#### Python

```python
def f():
    return 1
```

In Python, whitespace is significant for both the human and the machine in defining scopes.
The second line is indented, marking it a part of the function defined on the first line.

### Mismatched Significance

#### Markdown

```markdown
In Markdown, there's some mismatch.  
The previous line ends with 2 significant spaces.
This means that when rendered, it will remain a separate line,
while the rest of the lines will get merged.
This is not consistent across all variants,
making it even worse.
```

Since human readers cannot see the 2 trailing spaces, there's a mismatch.
We expect one output, but the computer gives us another.

#### C

```c
static OSStatus
SSLVerifySignedServerKeyExchange(SSLContext *ctx, bool isRsa, SSLBuffer signedParams,
                                 uint8_t *signature, UInt16 signatureLen)
{
	OSStatus        err;
	...

	if ((err = SSLHashSHA1.update(&hashCtx, &serverRandom)) != 0)
		goto fail;
	if ((err = SSLHashSHA1.update(&hashCtx, &signedParams)) != 0)
		goto fail;
		goto fail;
	if ((err = SSLHashSHA1.final(&hashCtx, &hashOut)) != 0)
		goto fail;
	...

fail:
	SSLFreeBuffer(&signedHashes);
	SSLFreeBuffer(&hashCtx);
	return err;
}
```

This is [Apple's goto-fail bug][] and it is one of my favourite examples of significant whitespace.
In line 12 there's a `goto fail` statement.
Due to the indentation (whitespace!) it reads (to the human) as if it belongs in the same block as line 11.
But since indentation is insignificant whitespace in C, the computer ignores it.

To be more explicit in C's syntax, we'll write it as follows:

```c
if ((err = SSLHashSHA1.update(&hashCtx, &signedParams)) != 0) {
    goto fail;
}
goto fail;
```

Making it clear that it will _always_ `goto fail`.

I like this example as it is a significant security issue that was (at least in part) caused by whitespace.



## Indistinguishable Hell

So we know whitespace is significant.
Both to humans and to machines.
Taking a look at any code-formatters we'll also see that people like it that way.
If I put these 2 different formatting options for a vote, I'm pretty sure which one will win:

```c
void f(int x) {
    if (x < 10) {
        printf("%d is smaller than 10.\n", x);
    else if {
        printf("%d is 10.\n", x);
    } else {
        printf("%d is larger than 10.\n", x);
    }
}
```

```c
void f(int x) {
if (x < 10) {
printf("%d is smaller than 10.\n", x);
else if {
printf("%d is 10.\n", x);
} else {
printf("%d is larger than 10.\n", x);
}
}
```

After all, none of us _really_ want to count matching braces.

So why does "significant whitespace" get so much hate?

Well, consider the following:

```python
# Python
def f():
	print("Indented using spaces.")
    print("Indented using tab.")
```

```mak
# makefile
target:
    echo "Fail!"
```

Both of these examples _look_ valid, but they aren't.
To the naked (human-) eye, they are indistinguishable from valid code.
But they mismatch spaces and tabs.
Two indistinguishable types of whitespace.

This is, as mentioned before, the cause of most of the issues people have with whitespace.
They expect it to work, but it doesn't.
In addition to that, there's no meaningful or straightforward way to detect it when you look at the code.
It's an invisible problem.



## Hate The Right Things

I am not going to tell you to stop hating significant whitespace. 
Whitespace hurt you, and that anger needs to be directed somewhere.
I will ask you, though, to point it in the right direction.

Visible, distinguishable whitespace, with matching human- and machine-significance, is a good thing.
It helps you make sense of the code, and helps ensure that the computer makes the same kind of sense of it as well.

Invisible, yet machine-significant whitespace is bad.
It leads to surprising outcomes and confuses the human writing the text.

Visible, yet machine-insignificant whitespace is also bad.
It leads to surprising outcomes and is tricky to detect.

Indistinguishable, yet significant whitespace is the worst.
It leads to bugs, errors, and pain.
Use whatever tool is available in your toolbox to fight it.
Use linters, formatters, and if all else fails - in-editor "visible whitespace" features.
Avoid writing systems that allow it.
And remember - the problem with Python is not that indentation is significant, it's that tabs are allowed.



[Wikipedia definition of a whitespace character]: https://en.wikipedia.org/wiki/Whitespace_character
[Apple's goto-fail bug]: https://www.imperialviolet.org/2014/02/22/applebug.html
