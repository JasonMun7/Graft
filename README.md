<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>
<!--
*** Thanks for checking out the Best-README-Template. If you have a suggestion
*** that would make this better, please fork the repo and create a pull request
*** or simply open an issue with the tag "enhancement".
*** Don't forget to give the project a star!
*** Thanks again! Now go create something AMAZING! :D
-->



<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT license][license-shield]][license-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/JasonMun7/Graft">
    <img width="80" height="80" alt="image" src="https://github.com/user-attachments/assets/1d86b143-65a7-4271-adf7-1d272cfb0e31" />
  </a>

<h3 align="center">Graft</h3>

  <p align="center">
    AI-powered Chrome extension that transforms dense text into clear, interactive diagrams right inside your browser.
    <br />
    <a href="https://github.com/JasonMun7/Graft"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/JasonMun7/Graft">View Demo</a>
    &middot;
    <a href="https://github.com/JasonMun7/Graft/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/JasonMun7/Graft/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project
<img width="1894" height="925" alt="image" src="https://github.com/user-attachments/assets/69144379-17cb-44ed-b877-9756acd24d87" />

The modern web is built on text, but human understanding is visual. Students, researchers, and professionals have to sift through dense articles, reports, and textbooks, trying to connect the dots hidden within paragraphs. The cognitive load is immense. Manually creating diagrams to aid understanding is slow, disruptive, and requires switching to separate design tools, breaking concentration and slowing progress. This not only makes comprehension harder, especially for visual learners or anyone short on time, but also makes communicating ideas harder. Complex concepts get buried in paragraphs when they could be shared more clearly and accurately through visual structure.

Graft is a Chrome extension that turns highlighted text into clear, customizable diagrams directly on the webpage, without switching tools or tabs.

* Highlight any passage and Graft analyzes the structure.
* Graft sends the selected text plus page context (page title, URL) to the AI for a more accurate and structured output.
* Graft displays a selection of diagrams to choose from.
* Users can refine it through natural language commands like “add a step,” “make this cyclical,” or “combine these nodes.”
* Users can easily export the final diagram as a PNG or SVG for use in presentations, notes, or articles.

Each node in the diagram is linked back to the exact sentence in the source article, so you can hover to trace where every idea came from. This makes complex information not only easier to understand, but also easier to verify and share.



<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Built With

* ![TypeScript]
* [![React][React.js]][React-url]
* ![Vite]
* ![Express.js]
* ![TailwindCSS]
* ![Gemini]

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

### Installation

1. Get a Gemini API Key from [Google AI Studio](https://aistudio.google.com/api-keys?_gl=1*1qqknxg*_ga*MTQyNzQ5MjEyMS4xNzYxNDQ0NTk4*_ga_P1DBVKWT6V*czE3NjE5Mzg1NjEkbzIkZzEkdDE3NjE5Mzg1OTEkajMwJGwwJGgxNzQ0Njk5Nzcz) if you want to use the image generation feature
2. Clone the repo
   ```sh
   git clone https://github.com/JasonMun7/Graft.git
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. Create a `.env` file at the root and enter your API key
   ```
   GEMINI_API_KEY = "ENTER YOUR API"
   ```
5. Build the extension
   ```sh
   npm run build
   ```
6. Make sure the Prompt API flags are enabled at chrome://flags
7. Enable 'Developer mode' at chrome://extensions/
9. Click 'Load unpacked' and select the `dist` directory that was created.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage
<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3
    - [ ] Nested Feature

See the [open issues](https://github.com/JasonMun7/Graft/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Top contributors:

<a href="https://github.com/JasonMun7/Graft/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=JasonMun7/Graft" alt="contrib.rocks image" />
</a>



<!-- LICENSE -->
## License

Distributed under the MIT license. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

* Jason Mun - jason.mun484@gmail.com - https://www.linkedin.com/in/jason-mun-25181b1b9/
* Andrew Cheung - andrewcheung360@gmail.com - https://www.linkedin.com/in/andrewcheung360/
* Justin Chung - justinjjhchung@gmail.com - https://www.linkedin.com/in/justinjjhchung/


Project Link: [https://github.com/JasonMun7/Graft](https://github.com/JasonMun7/Graft)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Excalidraw](https://docs.excalidraw.com/)
* [Chrome for Developers](https://developer.chrome.com/docs)
* [Gemini API](https://ai.google.dev/gemini-api/docs)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/JasonMun7/Graft.svg?style=for-the-badge
[contributors-url]: https://github.com/JasonMun7/Graft/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/JasonMun7/Graft.svg?style=for-the-badge
[forks-url]: https://github.com/JasonMun7/Graft/network/members
[stars-shield]: https://img.shields.io/github/stars/JasonMun7/Graft.svg?style=for-the-badge
[stars-url]: https://github.com/JasonMun7/Graft/stargazers
[issues-shield]: https://img.shields.io/github/issues/JasonMun7/Graft.svg?style=for-the-badge
[issues-url]: https://github.com/JasonMun7/Graft/issues
[license-shield]: https://img.shields.io/github/license/JasonMun7/Graft.svg?style=for-the-badge
[license-url]: https://github.com/JasonMun7/Graft/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png
<!-- Shields.io badges. You can a comprehensive list with many more badges at: https://github.com/inttter/md-badges -->
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Vite]: https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white
[TailwindCSS]: https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white
[Express.js]: https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB
[TypeScript]: https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white
[Gemini]: https://img.shields.io/badge/google%20gemini-8E75B2?style=for-the-badge&logo=google%20gemini&logoColor=white
