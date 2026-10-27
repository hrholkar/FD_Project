const topicResources = [
    {
      topic: "Java",
      videos: [
        { title: "Java Full Course - Learn Java in 8 Hours", url: "https://www.youtube.com/watch?v=Qgl81fPcLc8" },
        { title: "Object-Oriented Programming in Java", url: "https://www.youtube.com/watch?v=UhOBQgn-vUE" }
      ],
      articles: [
        { title: "Java Tutorial - W3Schools", url: "https://www.w3schools.com/java/" },
        { title: "Java Programming Basics - GeeksforGeeks", url: "https://www.geeksforgeeks.org/java/" }
      ]
    },
    {
      topic: "Python",
      videos: [
        { title: "Python for Beginners - Full Course", url: "https://www.youtube.com/watch?v=rfscVS0vtbw" },
        { title: "Python Crash Course", url: "https://www.youtube.com/watch?v=JGQ8RkNnlrE" }
      ],
      articles: [
        { title: "Python Tutorial - W3Schools", url: "https://www.w3schools.com/python/" },
        { title: "Learn Python - Real Python", url: "https://realpython.com/learn/" }
      ]
    },
    {
      topic: "Differentiation",
      videos: [
        { title: "Introduction to Derivatives", url: "https://www.youtube.com/watch?v=Z9OvRmC_R3U" },
        { title: "Differentiation - Khan Academy", url: "https://www.youtube.com/watch?v=Q_Oj2N_XzLs" }
      ],
      articles: [
        { title: "Differentiation Rules - MathIsFun", url: "https://www.mathsisfun.com/calculus/differentiation-rules.html" },
        { title: "Introduction to Differentiation - BYJU’S", url: "https://byjus.com/maths/differentiation/" }
      ]
    },
    {
      topic: "Integration",
      videos: [
        { title: "Basic Integration - Khan Academy", url: "https://www.youtube.com/watch?v=4vGiHC35j9s" },
        { title: "Integration Tricks and Rules", url: "https://www.youtube.com/watch?v=xK9TxsGoS9M" }
      ],
      articles: [
        { title: "Integration Explained - MathIsFun", url: "https://www.mathsisfun.com/calculus/integration-introduction.html" },
        { title: "Definite & Indefinite Integrals - Cuemath", url: "https://www.cuemath.com/calculus/integration/" }
      ]
    },
    {
      topic: "Algebra",
      videos: [
        { title: "Basic Algebra Explained", url: "https://www.youtube.com/watch?v=QzA6JeTvzgI" },
        { title: "Algebra 1 Full Course", url: "https://www.youtube.com/watch?v=1x2WjDJGdjw" }
      ],
      articles: [
        { title: "Algebra Basics - Khan Academy", url: "https://www.khanacademy.org/math/algebra" },
        { title: "Beginner's Guide to Algebra - MathIsFun", url: "https://www.mathsisfun.com/algebra/index.html" }
      ]
    },
    {
      topic: "Trigonometry",
      videos: [
        { title: "Trigonometry Basics | Sin, Cos, Tan", url: "https://www.youtube.com/watch?v=YKj5h2CYT9A" },
        { title: "Trigonometry Made Easy", url: "https://www.youtube.com/watch?v=nO3w8QwU8Xc" }
      ],
      articles: [
        { title: "Trigonometry Intro - MathIsFun", url: "https://www.mathsisfun.com/algebra/trig-introduction.html" },
        { title: "Trigonometry Formulas - BYJU'S", url: "https://byjus.com/maths/trigonometry-formulas/" }
      ]
    },
    {
      topic: "Data Structures",
      videos: [
        { title: "Data Structures Easy Guide", url: "https://www.youtube.com/watch?v=RBSGKlAvoiM" },
        { title: "DSA One-Shot in Java", url: "https://www.youtube.com/watch?v=8hly31xKli0" }
      ],
      articles: [
        { title: "Data Structures in Java - GeeksforGeeks", url: "https://www.geeksforgeeks.org/data-structures/" },
        { title: "Intro to Data Structures - W3Schools", url: "https://www.w3schools.com/dsa/index.php" }
      ]
    },
    {
      topic: "Machine Learning",
      videos: [
        { title: "Machine Learning Crash Course", url: "https://www.youtube.com/watch?v=Gv9_4yMHFhI" },
        { title: "ML Basics for Beginners", url: "https://www.youtube.com/watch?v=IoZGSQ07e8g" }
      ],
      articles: [
        { title: "Machine Learning - Google Crash Course", url: "https://developers.google.com/machine-learning/crash-course" },
        { title: "Intro to ML - GeeksforGeeks", url: "https://www.geeksforgeeks.org/machine-learning/" }
      ]
    },
    {
      topic: "HTML & CSS",
      videos: [
        { title: "HTML & CSS Full Course", url: "https://www.youtube.com/watch?v=G3e-cpL7ofc" },
        { title: "Build Webpages with HTML & CSS", url: "https://www.youtube.com/watch?v=UB1O30fR-EE" }
      ],
      articles: [
        { title: "HTML Tutorial - W3Schools", url: "https://www.w3schools.com/html/" },
        { title: "CSS Tutorial - W3Schools", url: "https://www.w3schools.com/css/" }
      ]
    },
    {
      topic: "C Programming",
      videos: [
        { title: "C Language Full Course", url: "https://www.youtube.com/watch?v=irqbmMNs2Bo" },
        { title: "Pointers in C Explained", url: "https://www.youtube.com/watch?v=zuegQmMdy8M" }
      ],
      articles: [
        { title: "C Language - GeeksforGeeks", url: "https://www.geeksforgeeks.org/c-programming-language/" },
        { title: "C Programming - W3Schools", url: "https://www.w3schools.com/c/" }
      ]
    },
    {
      topic: "C++",
      videos: [
        { title: "C++ Full Course for Beginners - FreeCodeCamp", url: "https://www.youtube.com/watch?v=vLnPwxZdW4Y" },
        { title: "C++ Programming Tutorial Series - The Cherno", url: "https://www.youtube.com/watch?v=18c3MTX0PK0&list=PLlrATfBNZ98dudnM48yfGUldqGD0S4Gb9" },
        { title: "Object-Oriented Programming in C++", url: "https://www.youtube.com/watch?v=wN0x9eZLix4" }
      ],
      articles: [
        { title: "C++ Programming Language - GeeksforGeeks", url: "https://www.geeksforgeeks.org/c-plus-plus/" },
        { title: "Learn C++ - Comprehensive Tutorials (LearnCpp.com)", url: "https://www.learncpp.com/" },
        { title: "C++ Language Reference - CppReference", url: "https://en.cppreference.com/w/cpp" },
        { title: "C++ Tutorial - W3Schools", url: "https://www.w3schools.com/cpp/" }
      ]
    }
  ];
  module.exports = topicResources;  