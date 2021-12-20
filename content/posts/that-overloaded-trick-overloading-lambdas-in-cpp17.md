---
title: "That `overloaded` Trick: Overloading Lambdas in C++17"
published: true
description: 
# tags: cpp, cpp17, programming
date: 2017-08-15
---

C++17 has granted us with [`std::variant`](http://en.cppreference.com/w/cpp/utility/variant). Simply put, it is a type-safe `union`. To access the value it stores, you can either request a specific type (using [`std::get`](http://en.cppreference.com/w/cpp/utility/variant/get) or something similar) or "visit" the variant, automatically handling only the data-type that is actually there.
Visiting is done using [`std::visit`](http://en.cppreference.com/w/cpp/utility/variant/visit), and is fairly straight forward.

[Compilation](https://godbolt.org/g/UhTBtD), [Execution](http://coliru.stacked-crooked.com/a/ce02024f6539db91)
```c++
#include <variant>
#include <cstdio>
#include <vector>

using var_t = std::variant<int, const char*>; // (1)

struct Print { // (2)
    void operator() (int i) {
        printf("%d\n", i);
    }

    void operator () (const char* str) {
        puts(str);
    }
};

int main() {
    std::vector<var_t> vars = {1, 2, "Hello, World!"}; // (3)

    for (auto& v : vars) {
        std::visit(Print{}, v); // (4)
    }

    return 0;
}
```

In (1) we define our variant type. In (2) we define a class with an overloaded `operator()`. This is needed for the call to `std::visit`. In (3) we define a vector of variants. In (4) we visit each variant. We pass in an instance of `Print`, and overload resolution ensures that the correct overload will be called for every type.
But this example forces us to write and name an object for the overloaded `operator()`. We can do better. In fact, the example for `std::visit` on [cppreference](http://en.cppreference.com/w/cpp/utility/variant/visit) already does. Here is an example derived from it:

[Compilation](https://godbolt.org/g/8gAj3y), [Execution](http://coliru.stacked-crooked.com/a/2edc87064e156115)
```c++
#include <variant>
#include <cstdio>
#include <vector>

template<class... Ts> struct overloaded : Ts... { using Ts::operator()...; }; // (1)
template<class... Ts> overloaded(Ts...) -> overloaded<Ts...>;  // (2)

using var_t = std::variant<int, const char*>;

int main() {
    std::vector<var_t> vars = {1, 2, "Hello, World!"};

    for (auto& v : vars) {
        std::visit(overloaded {  // (3)
            [](int i) { printf("%d\n", i); },
            [](const char* str) { puts(str); }
        }, v);
    }

    return 0;
}
```

This is certainly more compact, and we removed the `Print` struct. But how does it work? You can see a class-template (1), lambdas passed in as arguments for the construction (3), and something with an arrow and some more template magic (2). Let's build it step by step.

First, we want to break the print functions out of `Print` and compose them later.

[Compilation](https://godbolt.org/g/ZuyYrD), [Execution](http://coliru.stacked-crooked.com/a/4e90f3c2ae1a5113)
```c++
struct PrintInt { //(1)
    void operator() (int i) {
        printf("%d\n", i);
    }
};

struct PrintCString { // (2)
    void operator () (const char* str) {
        puts(str);
    }
};

struct Print : PrintInt, PrintCString { // (3)
    using PrintInt::operator();
    using PrintCString::operator();
};
```
In (1) and (2), we define the same operators as before, but in separate structs. In (3), we are inherit from both of those structs, then explicitly use their `operator()`. This results in exactly the same results as before. Next, we convert `Print` into a class template. I'll jump ahead and convert it directly to a variadic template.

[Compilation](https://godbolt.org/g/iXGT2p), [Execution](http://coliru.stacked-crooked.com/a/3e9902784fec5791)
```c++
template <class... Ts> // (1)
struct Print : Ts... {
    using Ts::operator()...;
};

int main() {
    std::vector<var_t> vars = {1, 2, "Hello, World!"};

    for (auto& v : vars) {
        std::visit(Print<PrintCString, PrintInt>{}, v); // (2)
    }

    return 0;
}
```

In (1) we define the template. We take an arbitrary number of classes, inherit from them, and use their `operator()`. In (2) we instantiate the `Print` class-template with `PrintCString` and `PrintInt` to get their functionality.
Next, we want to use [lambdas](http://en.cppreference.com/w/cpp/language/lambda) to do the same. This is possible because lambdas are not functions; they are objects implementing `operator()`.

[Compilation](https://godbolt.org/g/bFzYUP), [Execution](http://coliru.stacked-crooked.com/a/ed95f8db6c30562e)
```c++
int main() {
    std::vector<var_t> vars = {1, 2, "Hello, World!"};
    auto PrintInt = [](int i) { printf("%d\n", i); }; // (1)
    auto PrintCString = [](const char* str) { puts(str); };

    for (auto& v : vars) {
        std::visit(
            Print<decltype(PrintCString), decltype(PrintInt)>{PrintCString, PrintInt}, // (2)
            v);
    }

    return 0;
}
```
In (1) we define the lambdas we need. In (2) we instantiate the template with our lambdas. This is ugly. Since lambdas have unique types, we need to define them before using them as template parameters (deducing their types using `decltype`). Then, we need to pass the lambdas as arguments for [aggregate initialization](http://en.cppreference.com/w/cpp/language/aggregate_initialization) as lambdas have a delete default constructor. We are close, but not quite there yet.
The `<decltype(PrintCString), decltype(PrintInt)>` part is really ugly, and causes repetition. But it is needed as ctors cannot do type-deduction. So in proper C++ style, we will create a function to circumvent that.

[Compilation](https://godbolt.org/g/S3XGZr), [Execution](http://coliru.stacked-crooked.com/a/8f373b382ed73d3b)
```c++
template <class... Ts> // (1)
auto MakePrint(Ts... ts) {
    return Print<Ts...>{ts...};
}

int main() {
    std::vector<var_t> vars = {1, 2, "Hello, World!"};

    for (auto& v : vars) {
        std::visit(
            MakePrint( // (2)
                [](const char* str) { puts(str); },
                [](int i) { printf("%d\n", i); }
                ),
            v);
    }

    return 0;
}
```

In (1) we define our helper function, to perform type deduction and forward it to the ctor. In (2) we take advantage of our newly found type-deduction to define the lambdas inline. But this is C++17, and we can do better.

C++17 added  [user-defined deduction guides](http://en.cppreference.com/w/cpp/language/class_template_argument_deduction). Those allow us to instruct the compiler to perform the same actions as our helper function, but without adding another function. Using a suitable deduction guide, the code is as follows.

[Compilation](https://godbolt.org/g/ZZXM6L), [Execution](http://coliru.stacked-crooked.com/a/1bbf8c7cccedd3d8)
```c++
#include <variant>
#include <cstdio>
#include <vector>

using var_t = std::variant<int, const char*>;

template <class... Ts>
struct Print : Ts... {
    using Ts::operator()...;
};

template <class...Ts> Print(Ts...) -> Print<Ts...>; // (1)

int main() {
    std::vector<var_t> vars = {1, 2, "Hello, World!"};

    for (auto& v : vars) {
        std::visit(
            Print{ // (2)
                [](const char* str) { puts(str); },
                [](int i) { printf("%d\n", i); }
            },
            v);
    }

    return 0;
}
```
In (1) we define a deduction guide which acts as our previous helper function, and in (2) we use the constructor instead of a helper function. Done.

Now we have fully recreated the original example. As `Print` is no longer indicative of the template-class' behavior, `overloaded` is probably a better name.

```c++
template<class... Ts> struct overloaded : Ts... { using Ts::operator()...; };
template<class... Ts> overloaded(Ts...) -> overloaded<Ts...>;
```