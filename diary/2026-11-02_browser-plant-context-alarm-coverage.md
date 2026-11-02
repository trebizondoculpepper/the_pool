# Browser plant context: more alarm sources

Mission 134 already exposed equipment and Wash-O-Tron readings, but its alarm query omitted the central control-room annunciator, boiler cascade manager and manual fire call points. I added read-only facts for those model states, including a central window's separate condition and retained lamp, header measurements for the cascade, and the latched state of each call point. The visible report now includes each alarm's model details. Targeted tests exercise a cleared central alarm awaiting reset, a flashing header-low lamp and a pressed fire call point.

The owner also asked for the shared Vite server to be stopped and a root launcher. `dev-server.sh` runs it on `0.0.0.0:5175` with a strict port; the server was stopped after the launcher was made. Browser-assistant compatibility remains unverified in Claude, Gemini and ChatGPT, and the remaining modelled alarm families need readers.
