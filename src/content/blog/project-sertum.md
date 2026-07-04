---
title: Project Sertum
excerpt: Sertum is an IoT robot designed to serve and clean, using an Arduino Mega board and Bluetooth. It can serve food, clean surfaces, and detect obstacles, all controlled through an Android app. Perfect for both homes and restaurants.
category: GENERAL
date: 4/15/2019
isoDate: "2019-04-15"
readTime: 2 min read
cover: /images/blog/sertum/cover.jpg
coverAlt: Project Sertum robot
order: 4
---

Sertum is a versatile robot designed to serve and clean, drawing its name from the English word "serving" and the Latin word "dictum". This robot features a main cleaner, two side cleaners, and a cooling fan located at the back. In the front, there is a water dispenser connected to a water compartment, allowing it to release water as needed. Sertum operates via Bluetooth and is controlled through a dedicated Android app, which provides all necessary details for operation.

<div class="my-10 text-center">
  <h2 class="!mt-0 mb-2 text-2xl font-bold text-gray-900">Idea pitching</h2>
  <p class="mb-6 text-gray-500">Checkout how the project idea is like!</p>
  <div class="aspect-video w-full overflow-hidden rounded-2xl">
    <iframe src="https://www.youtube.com/embed/gl91nt5ZPr4" title="Project Sertum — idea pitching" class="h-full w-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
  </div>
</div>

## Functionality and Use Cases

Sertum can serve food or utilities to specific destinations, making it suitable for both household and commercial environments. In homes, it can serve food to guests or owners, while in commercial settings, such as restaurants or food vending shops, Sertum can clean the premises and serve food to designated tables.

## Technologies Used

This project is built on an Arduino Mega board, with the robot's operations controlled via Bluetooth. A motor driver controls the movement of the robot in all directions (forward, backward, sideways). Sertum is equipped with two small motors for side cleaning, which have high RPMs but low torque, and one motor with low RPM and high torque for the main cleaning mechanism.

A separate circuit generates the necessary current for the motors, as the Arduino board provides insufficient current on its own. To ensure efficient navigation, Sertum uses an ultrasonic sensor to detect obstacles in its path. Additionally, it has a water compartment with a water level sensor that monitors the water level. If the water level is low, a red LED will illuminate, and when full, a green LED will indicate that Sertum is ready for use.

A solenoid valve is installed at the top of the robot, which dispenses water when triggered. The valve opens to release the water and closes automatically, with its operation also controlled by the Arduino Mega board.

## Android App Integration

The Android app, developed using Android Studio, allows users to control Sertum easily. For commercial use, a specialized version of the app is available for restaurants. In this scenario, each table in the restaurant is equipped with a device that allows customers to place orders directly. Once an order is placed, Sertum will deliver the food to the correct table.

<div class="my-10 grid grid-cols-3 gap-3">
  <img src="/images/blog/sertum/img1.jpg" alt="Sertum robot" class="aspect-square w-full rounded-xl object-cover" loading="lazy" />
  <img src="/images/blog/sertum/img2.jpg" alt="Sertum mechanism" class="aspect-square w-full rounded-xl object-cover" loading="lazy" />
  <img src="/images/blog/sertum/img3.jpg" alt="Sertum components" class="aspect-square w-full rounded-xl object-cover" loading="lazy" />
</div>

<div class="my-10 text-center">
  <h2 class="!mt-0 mb-2 text-2xl font-bold text-gray-900">Final Product</h2>
  <p class="mb-6 text-gray-500">Checkout how the final product is like!</p>
  <div class="aspect-video w-full overflow-hidden rounded-2xl">
    <iframe src="https://www.youtube.com/embed/Wi0BJqIS9uw" title="Project Sertum — final product" class="h-full w-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
  </div>
</div>
