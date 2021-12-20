---
title: A Functional-Style State Machine in C++, Part 2
published: true
description: 
# tags: cpp, patterns, coding
# series: A Functional-Style State Machine in C++
date: 2017-09-04
---

First, an apology.
The first part of this post was published on May 26. It is now September. I had most of the code for this part done by then. But finalizing the code took some more effort. Once that was done, explaining took a while. There were quite a few things I had to learn myself first.
So now, months later, I present this humble offering to the Gods of C++ and template meta-programming.

----

## Generalizing ðŸŒˆ

In [Part 1](https://dev.to/tmr232/a-functional-style-state-machine-in-c) we created our `State` or `SelfReturning` class (provided below for reference). It works, but as you can see - required modifications whenever we change the function arguments or return types.

[Compilation](https://godbolt.org/g/1XqEhY)
```c++
struct SelfReturning {
    using RetType = std::pair<SelfReturning, const Context>;
    using FuncType = RetType(*)(const Context&, Event);

    SelfReturning(FuncType func) : _func{func} {};
    RetType operator()(const Context& ctx, Event evt) { return _func(ctx, evt); }

    FuncType _func;
};

using State = SelfReturning;
```

The first thing we want to do is get rid of this requirement. First, function arguments.
[Compilation](https://godbolt.org/g/RNnzcc)

```c++
template <class... Args>
struct SelfReturning {
    using RetType = std::pair<SelfReturning, const Context>;
    using FuncType = RetType(*)(Args... args);      // (1)

    SelfReturning(FuncType func) : _func{func} {};
    RetType operator()(Args... args) {              // (2)
        return _func(std::forward<Args>(args)...);
    }

    FuncType _func;
};

using State = SelfReturning<const Context&, Event>;
```

Here we use [variadic templates](http://en.cppreference.com/w/cpp/language/parameter_pack) and [perfect forwarding](http://en.cppreference.com/w/cpp/utility/forward) to forward all the function arguments directly to the target function. You can see that in (1) and (2) we use `Args...` and not the common `Args&&...`. This is because the types are defined by the class template and are not deduced on the function call.

With this behind us, we address the return type.
Here we come to another recursive issue. While the return type `std::pair<SelfReturning, const Context>` depends on our `SelfReturning` type, `SelfReturning` itself depends on the return type. This means that just passing in the return type will not work (much like our original return-type issue). To solve it, we use a [template-template parameter](http://en.cppreference.com/w/cpp/language/template_parameters).

[Compilation](https://godbolt.org/g/DVgRPx)
```c++
template <template <class T> class Base, class... Args> // (1)
struct SelfReturning {
    using RetType = Base<SelfReturning>; //(2)
    using FuncType = RetType(*)(Args... args);

    SelfReturning(FuncType func) : _func{ func } {}
    RetType operator() (Args... args) {
        return _func(std::forward<Args>(args)...);
    }

    FuncType _func;
};

template <class T>
using PairWithCtx = std::pair<T, const Context>; // (3)

using State = SelfReturning<PairWithCtx, const Context&, Event>;
```

In (1), we pass in the template for the return type. In (2), we instantiate the type with our `SelfReturning` class. As we've seen before, C++ allows this type of recursion, so we're safe. In (3) we define our return-type template to be a pair with a `const Context` as the second member.
Done.

But what if we want to only return the `SelfReturning` class? For that, we define a new template - an identity template.

```c++
template <class T>
struct identity {
	using type = T;
};

template <class T>
using identity_t = typename identity<T>::type;
```

We define the `identity` struct to hold a type, and use the `identity_t` alias to access the type directly. This looks a bit odd, but C++ does not allow us to alias the template parameter directly. When isntatiating the `identity_t` template with a type, we get the safe type again. Using that, we can return `SelfReturning` directly.

```c++
using State = SelfReturning<identity_t>;
```

Personally, though, I hate having to write down the trivial cases explicitly. So let's use some dirty tricks.

```c++
template <template <class T> class Base = identity_t, class... Args> // (1)
struct SelfReturning {
    using RetType = Base<SelfReturning>;
    using FuncType = RetType(*)(Args... args);

    SelfReturning(FuncType func) : _func{ func } {}
    RetType operator() (Args... args) {
        return _func(std::forward<Args>(args)...);
    }

    FuncType _func;

    template <class... AltArgs>
    using WithArgs = SelfReturning<Base, AltArgs...>; // (2)
};
```
In (1) we simply add `identity_t` as the default argument for `Base`. This lets us write the most trivial case (return `SelfReturning`, take no arguments) as `SelfReturning<>`. Nice.
However, if we put anything into this set of template arguments, it will override `identity_t`. That's what the code at (2) is for. We set `WithArgs` to be `SelfReturning` with whatever `Base` parameter it already has, thus only accepting template parameters for the arguments. Now we can write all of the following with ease.
[Compilation](https://godbolt.org/g/xvtKaE)

```c++
using Trivial = SelfReturning<>;
using InPair = SelfReturning<PairWithCtx>;

using TrivialWithArgs = SelfReturning<>::WithArgs<Context&, Event>;
using InPairWithArgs = SelfReturning<PairWithCtx>::WithArgs<const Context&, Event>;
// Or alternatively
using InPairWithArgs2 = SelfReturning<PairWithCtx, const Context&, Event>;
```


In [Part 1](https://dev.to/tmr232/a-functional-style-state-machine-in-c) I promised generalizing the `SelfReturning` class and getting some compile time guarantees. We've accomplished our generalization goal, so it's time to get some safety in place.

## Increasing Safety ðŸš“

While our use of the `switch` statement to discern different events is nice and concise, it is also somewhat error prone. It is easy to miss a case (though that can be prevented using compiler errors) or accidentally mistake one event for another. The latter is especially true if we want to pass information along with our event notification.
One easy way to avoid those mistakes is to resolve the choice using function overloading instead of switch statements. Consider the following
```C++
#include <cstdio>

// (1)
enum class EventType {A, B};

void Switch(EventType evt) {
    switch(evt) {
        case EventType::A:
            puts("A");
            return;
        case EventType::B:
            puts("B");
            return;
    }
}

// (2)
struct EventA {};
struct EventB {};

void Overload(EventA) { puts("A"); }
void Overload(EventB) { puts("B"); }
```
In (1) we use a `switch` to discern the event type. It is easy to forget a `return` or a `break`. If we passed more data along, the signature for `Switch` would likely change to `void Switch(EventType evt, void* data)`. That's definitely bad.
In (2), we cannot mistake  the types, and data can easily be passed inside the event structs. Sadly, the events are not different types, and C++ does not allow for heterogeneous containers. Or does it?

Enter C++17's âœ¨`std::variant`âœ¨. 

What is `std::variant`, you ask? Well, it is a `union`. A *safe* `union`! Safe meaning that you can only get a value from it if it really is there. No more type confusion; no more casting `void` pointers. But how do we get the values out of `std::variant`? Using `std::visit`, of course!
[Compilation](https://godbolt.org/g/EfBahi), [Execution](http://coliru.stacked-crooked.com/a/95c37042037573ca)

```c++
#include <variant>
#include <vector>
#include <cstdio>

struct EventA {}; // (1)
struct EventB {};

struct EventHandler {  // (2)
    void operator() (EventA) { puts("A"); }
    void operator() (EventB) { puts("B"); }
};

using event_t = std::variant<EventA, EventB>;

int main() {
    std::vector<event_t> events = {EventA{}, EventB{}};

    for (auto& event : events) {
        std::visit(EventHandler{}, event); // (3)
    }

    return 0;
}
```

In (1) we define our new event types. This time they are different types, not just different values. In (2) we define our event handler. All we need is an function overload for every possible type, and a struct with multiple `operator()` methods is an easy way to do it. Now all that is left to do is call `std::visit` with our handler and an event. If we forget to handle an event type - the code [does not compile!](https://godbolt.org/g/Lzu3xV) This way, we _know_ that we always handle all event types, and never mix them up.

Now, if you liked the previous part, you probably don't like writing a different handler class for every function. It completely ruins the locality of the code. But, we are using C++17, aren't we?
[Compilation](https://godbolt.org/g/bqsqE9), [Execution](http://coliru.stacked-crooked.com/a/31074c40d4c9654d)
```c++
#include <variant>
#include <vector>
#include <cstdio>

template<class... Ts> struct overloaded : Ts... { using Ts::operator()...; }; // (1)
template<class... Ts> overloaded(Ts...) -> overloaded<Ts...>;

struct EventA {};
struct EventB {};

using event_t = std::variant<EventA, EventB>;

int main() {
    std::vector<event_t> events = {EventA{}, EventB{}};

    for (auto& event : events) {
        std::visit(overloaded {         // (2)
            [] (EventA) { puts("A"); },
            [] (EventB) { puts("B"); }
        }, event);
    }

    return 0;
}
```

If you're not familiar with C++17, there may be a lot to take in here. In (1) we define a class that takes multiple lambdas and overloads them. In (2) we instantiate that class to inline our event handling functions. The full explanation to this code is a bit long, so I wrote [another post](https://dev.to/tmr232/that-overloaded-trick-overloading-lambdas-in-c17) to explain it.

Applied to the state-machine, it will look like this:
[Compilation](https://godbolt.org/g/4VNxEM), [Execution](http://coliru.stacked-crooked.com/a/3bfd9a9220c60cb4)
```c++
#include <tuple>
#include <cstdio>
#include <cstdlib>
#include <variant>

template<class... Ts> struct overloaded : Ts... { using Ts::operator()...; };
template<class... Ts> overloaded(Ts...) -> overloaded<Ts...>;

struct EventA {};
struct EventB {};

using Event = std::variant<EventA, EventB>;

struct Context {
    Context Inc() const {
        return Context{counter + 1};
    }
    int counter = 0;
};

template <class T>
struct identity {
	using type = T;
};

template <class T>
using identity_t = typename identity<T>::type;

template <template <class T> class Base = identity_t, class... Args>
struct SelfReturning {
    using RetType = Base<SelfReturning>;
    using FuncType = RetType(*)(Args... args);

    SelfReturning(FuncType func) : _func{ func } {}
    RetType operator() (Args... args) {
        return _func(std::forward<Args>(args)...);
    }

    FuncType _func;

    template <class... AltArgs>
    using WithArgs = SelfReturning<Base, AltArgs...>;
};

template <class T>
using PairWithCtx = std::pair<T, const Context>;

using State = SelfReturning<PairWithCtx>::WithArgs<const Context&, Event>;

State::RetType A(const Context&, Event);
State::RetType B(const Context&, Event);

State::RetType A(const Context& ctx, Event evt) {
    printf("State A, counter = %d\n", ctx.counter);
    return std::visit(overloaded{
        [&] (EventA) { return make_pair(A, ctx); },
        [&] (EventB) { return make_pair(B, ctx.Inc()); }
    }, evt);
}

State::RetType B(const Context& ctx, Event evt) {
    printf("State B, counter = %d\n", ctx.counter);
    return std::visit(overloaded{
        [&] (EventA) { return make_pair(A, ctx.Inc()); },
        [&] (EventB) { return make_pair(B, ctx); }
    }, evt);
}

int main() {
    State state = A;
    Context ctx{};
    Event events[] = {EventB{}, EventA{}, EventB{}, EventA{}, };

    for (auto evt : events) {
        std::tie(state, ctx) = state(ctx, evt);
    }

    return 0;
}
```
As you can see, the change is minimal.

## Passing In Data ðŸšš

With that, it is time to address an issue I completely neglected in Part 1.
Passing in data.

Our current state-machine model is based on the idea that the events themselves are the only information the states need. This is naive. In many real-life scenarios, events carry data with them. Now, with `std::variant`, we can puts data into the different event types. All we need to do is add data-members to our event structs. We define our new, data-carrying events as follows:
```c++
struct EventA {
    const char* msg{nullptr};
};
struct EventB {
    int number{0};
};
```
Nothing else needs to change. And now, in the state functions, we can easily access the event data:
```C++
State::RetType A(const Context& ctx, Event evt) {
    printf("State A, counter = %d\n", ctx.counter);
    return std::visit(overloaded{
        [&] (EventA e) { 
            if (e.msg != nullptr) {
                printf("A message = \"%s\"", e.msg);
            } else {
                puts("A message = nullptr");
            }
            return make_pair(A, ctx); 
        },
        [&] (EventB) { return make_pair(B, ctx.Inc()); }
    }, evt);
}

State::RetType B(const Context& ctx, Event evt) {
    printf("State B, counter = %d\n", ctx.counter);
    return std::visit(overloaded{
        [&] (EventA e) { return make_pair(A, ctx.Inc()); },
        [&] (EventB e) { 
            printf("B number = %d\n", e.number);
            return make_pair(B, ctx); 
        }
    }, evt);
}
```
Et voilÃ .

Putting everything together now, we get the following code:

[Compilation](https://godbolt.org/g/rR5udQ),[Execution](http://coliru.stacked-crooked.com/a/273170beeb72c9a7)
```c++
#include <tuple>
#include <cstdio>
#include <cstdlib>
#include <variant>

template<class... Ts> struct overloaded : Ts... { using Ts::operator()...; };
template<class... Ts> overloaded(Ts...) -> overloaded<Ts...>;

struct EventA {
    const char* msg{nullptr};
};
struct EventB {
    int number{0};
};

using Event = std::variant<EventA, EventB>;

struct Context {
    Context Inc() const {
        return Context{counter + 1};
    }
    int counter = 0;
};

template <class T>
struct identity {
	using type = T;
};

template <class T>
using identity_t = typename identity<T>::type;

template <template <class T> class Base = identity_t, class... Args>
struct SelfReturning {
    using RetType = Base<SelfReturning>;
    using FuncType = RetType(*)(Args... args);

    SelfReturning(FuncType func) : _func{ func } {}
    RetType operator() (Args... args) {
        return _func(std::forward<Args>(args)...);
    }

    FuncType _func;

    template <class... AltArgs>
    using WithArgs = SelfReturning<Base, AltArgs...>;
};

template <class T>
using PairWithCtx = std::pair<T, const Context>;

using State = SelfReturning<PairWithCtx>::WithArgs<const Context&, Event>;

State::RetType A(const Context&, Event);
State::RetType B(const Context&, Event);

State::RetType A(const Context& ctx, Event evt) {
    printf("State A, counter = %d\n", ctx.counter);
    return std::visit(overloaded{
        [&] (EventA e) { 
            if (e.msg != nullptr) {
                printf("A message = \"%s\"", e.msg);
            } else {
                puts("A message = nullptr");
            }
            return make_pair(A, ctx); 
        },
        [&] (EventB) { return make_pair(B, ctx.Inc()); }
    }, evt);
}

State::RetType B(const Context& ctx, Event evt) {
    printf("State B, counter = %d\n", ctx.counter);
    return std::visit(overloaded{
        [&] (EventA e) { return make_pair(A, ctx.Inc()); },
        [&] (EventB e) { 
            printf("B number = %d\n", e.number);
            return make_pair(B, ctx); 
        }
    }, evt);
}

int main() {
    State state = A;
    Context ctx{};
    Event events[] = {EventB{}, EventA{}, EventB{}, EventB{10}, EventA{}, EventA{"Hello, world!"}};

    for (auto evt : events) {
        std::tie(state, ctx) = state(ctx, evt);
    }

    return 0;
}
```

## Summary ðŸŽ“

As promised, we have used some dark template magic to achieve:
1. A nice generalization of `SelfReturning`, allowing customization of both return types and argument types;
1. Better compile-time safety by replacing the `switch` statement with overload resolution;
1. Passing data along with the events.
1. Hopefully, a lot of fun along the way.