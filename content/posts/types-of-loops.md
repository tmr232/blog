---
title: Types of Loops
published: true
description: Minor brain-dump of experiences from teaching programmers from complete scratch.
# tags: teaching, beginner, experience
date: 2018-01-27
---

Recently I've been helping & tutoring some true code beginners. Not someone new to a language, but completely new to programming.

I've done a lot of training in the past. Both beginner and advanced training, both programming and reverse-engineering. But as green as my previous students have been, they have always had some prior knowledge, some experience with code. In at least one programming language.

Usually the training is about teaching language features, special tricks, best practices, and getting the trainees familiar with the new patterns. The trainees send out probes, looking for familiar things, and I just fill them in at the right time. They know what they are looking for, or can be easily guided towards the right thing. When people are completely green, they don't. 

This is a very new experience for me, and it got me thinking a lot about programming and the ways we approach code. The patterns we seek to find or form. The amazing number of things that we do without even thinking as experience programmers. Each of those, no matter how simple, needs to be broken up and explained to new-comers. They have no previous knowledge to build upon for this.

From my current experience, it seems the understanding the meaning of syntax, and understanding forward-flowing programs is easy enough. Conditionals are a non-issue. The first road-block comes with loops. Especially writing loops. Where do I put the return statement? Where do I define my variables?
Trying to explain those things, and give simple rules, I came to some useful realizations of useful patterns, and some painful truths about our use of jargon.

Let's go ahead and see the patterns.

## Find Loops

```java
public static int indexOf(String[] haystack, String needle) {
    for (int i = 0; i < haystack.length; ++i) {
        if (needle.equals(haystack[i])) {
            return i;
        }
    }
    
    return -1;
}
```

In those loops we iterate over the array, looking for an item that fulfills our condition. Once we find it, we immediately return that value. There is no need to declare any variables.

## Count Loops

```java
public static int countOf(String[] haystack, String needle) {
    int count = 0;
    for (int i = 0; i < haystack.length; ++i) {
        if (needle.equals(haystack[i])) {
            count++;
        }
    }
    
    return count;
}
```

In those loops we iterate over the array, looking for items that fulfill our condition. Whenever we find one, we increment the count. Once we exhaust the iteration, we return the counter. The counter and return statement are outside the loop.

## Action Loops

```java
public static void printAll(String[] haystack) {
    for (int i = 0; i < haystack.length; ++i) {
        System.out.println(haystack[i]);
    }
}
```

In those loops we iterate over the array, and perform an action on each and every item. There are no variables and no return statements.


Now, those simple loops can do quite a lot, and can be expanded and composed to do more. And I find that they help beginners. But did you spot my error? I used the word "iterate". 

## Vocabulary

While the meaning of "iterate" is clear to existing programmers, and looking at the loops you can easily tell that we are iterating or looping over `haystack`, it is not clear for beginners. Moreover, the words themselves sound weird. This is critical, and becomes more pronounced as you try and loop in slightly more advanced ways

```java
int i = 0;
for (Node current = myList.head; current != null; current = current.getNext(), ++i) {
    // ...
}
```

Here, we are looping (or iterating) over `myList`, but we don't change anything about it, or even access it directly. We do change `i` (which is no longer our counter) and `current` which is a node. This makes the code and language quite dissonant. "We iterate over `myList` while maintaining an index" is a true statement, but not an immediate translation from the code. The language forces to go in a very roundabout manner. This is true for many languages. 
But now, consider slightly more modern syntax:

```python
for i, node in enumerate(myList):
    # ...
```

```go
for i, node := range myList {
    // ...
}
```

```rust
for (i, node) in myList.enumerate() {
    // ...
}
```

In all of those, the situation is far clearer. We can see that we're looping over `myList`, and it is clear that we have both a node and an index.
While this difference might be minor for experienced programmers, it is a world of difference for newcomers.

Learning to code is not just learning a programming language. Not just learning to think in a specific way. It is learning your own language again. You know English? Well, now you need to learn programming-English. You know Hebrew? Learn programming-Hebrew. We keep changing the meaning of existing words, and expect people to follow and understand them. It is hard. The least we can do is try and minimize the difference between the code we read (programming languages - Java, C, C++, Python, Go, Rust...) and the code we speak (well, I guess English is a programming language as well?).