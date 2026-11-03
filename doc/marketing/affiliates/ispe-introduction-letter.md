# Introduction letter: the Institute of Swimming Pool Engineers

Draft, 2026-11-03, to Luke at the Institute of Swimming Pool Engineers (ISPE). Check the facts against the current build before sending, and the signature.

---

Subject: _The Pool_: a simulation game of a pool plant room, and an invitation to look at it

Dear Luke,

I'm a software developer working on _The Pool_, a game that simulates the engineering and operation of a large leisure centre's swimming pools: not the pool hall, but the plant rooms behind it. You can play the current development build in a web browser here, with no download or sign-up: https://trebizondoculpepper.github.io/the_pool/ (the source is at https://github.com/trebizondoculpepper/the_pool).

The player walks round the plant in first person and works it by hand. Everything is a working component of a running model, not scenery: valves open and shut, pumps start and trip, gauges and meters read the model's values, lamps light, chart recorders record. What is in it now:

- **Four pools, each with its own plant room:** a leisure pool, a 50 m competition pool, a spa and a footbath, each with balance tanks, duty and standby circulation pumps, filters and their valves, all connected as one hydraulic model.
- **Filtration and backwashing:** sand filter batteries with a backwash controller that runs real sequences (drain down, air scour, backwash, rinse, settle) and refuses a wash when circulation, the backwash pit's capacity or a valve says it must not.
- **Water treatment:** chlorine and acid dosing under a chemical controller, CO₂ dosing for pH with mass-flow control, ozone and UV, the chemical store and its deliveries, and a poolside test kit that reads free and total chlorine, pH, alkalinity, hardness and cyanuric acid as a lifeguard's DPD and phenol red tests would.
- **Heating:** six condensing boilers in a cascade, staged by a sequencer, feeding an LTHW ring at 80/60 °C; each pool's heat exchanger has its own temperature controller and modulating control valve, and the pools, halls and the building lose heat to the outside, which follows the real weather in Manchester, so the gas bill goes up in winter.
- **Electrical and controls:** switch rooms with feeders and isolators, plant control panels with HAND · OFF · AUTO selectors and trip resets that are only local, and an old-style control room of mimic boards, annunciators, a dot-matrix alarm printer and a BBC Micro, where problems are diagnosed before someone has to go to the plant room to put them right.
- **Faults and consequences:** a shut isolator, a stuck valve, a tripped pump, a failed sensor or a gas cut each play out through the model: pools drift out of temperature, chlorine falls, alarms raise, and the player has to find out why.

Most of it rests on published sources: PWTAG's _Swimming Pool Water_, CIBSE guides, HSE guidance, BS and EN standards, and manufacturers' datasheets and manuals, each recorded with its figures as the work goes along. But I have never worked in the swimming pool industry, and I'm sure there are gaps between my plant and how a real one is run: what an engineer would actually see and do, what goes wrong in practice, and what a real plant room has that mine is missing.

That is why I'm writing. I wondered whether the project might interest you or ISPE's members, and whether anyone would be willing to have a look and tell me where it is wrong. Although I'm making it as a game, I think it could also be useful in training and education: for apprentices, for new duty managers, or simply for showing people the engineering that keeps a pool clean, warm and safe.

I'd be very happy to give you a short demonstration, online or in person, and to talk about whether there might be some mutual interest.

Kind regards,

Sal Fadhley
