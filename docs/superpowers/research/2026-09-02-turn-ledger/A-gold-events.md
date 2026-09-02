# Appendix A. Gold 2026-08-21, every marker

Source: `docs/gold-star-run.txt`. One row per `[N]` marker. **cost** = next marker's N minus this one (1 = this block spent a turn; 0 = free; last block: 0 if it printed `This combat did not cost a turn`, else 1). **ended by** is read from the block's own action lines; blank on a free win means the fight was free by zone or by wanderer type (goblin, golem copy, rift, cyber, locket, time cop).

| line | turn | cost | zone                               | encounter                                                              | ended by                                               |
| ---- | ---- | ---- | ---------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| 1239 | 1    | 0    | The Haunted Pantry                 | The Singing Tree                                                       | NC                                                     |
| 1247 | 1    | 1    | The Haunted Pantry                 | Cut Down in His Prime                                                  | NC                                                     |
| 1257 | 2    | 0    | The Haunted Pantry                 | fiendish can of asparagus                                              | free run: Spring Away                                  |
| 1313 | 2    | 1    | The Haunted Pantry                 | overdone flame-broiled meat blob; Dart Perks                           | paid kill                                              |
| 1387 | 3    | 1    | The Haunted Pantry                 | possessed can of tomatoes; Dart Perks                                  | paid kill                                              |
| 1442 | 4    | 1    | The Haunted Pantry                 | overdone flame-broiled meat blob                                       | paid kill                                              |
| 1490 | 5    | 1    | The Haunted Pantry                 | A Sandwich Appears!                                                    | NC                                                     |
| 1570 | 6    | 0    | An Octopus's Garden                | Neptune flytrap                                                        | free kill: Shattering Punch, darts bullseye            |
| 1648 | 6    | 0    | The Skeleton Store                 | Skeletons In Store                                                     | NC                                                     |
| 1666 | 6    | 0    | Dig up a skeleton                  | remaindered skeleton                                                   | free win                                               |
| 1721 | 6    | 0    | The Wreck of the Edgar Fitzsimmons | Time is a Möbius Strip                                                 | NC                                                     |
| 1739 | 6    | 0    | The Wreck of the Edgar Fitzsimmons | sausage goblin                                                         | free kill: Shattering Punch                            |
| 1773 | 6    | 1    | The Wreck of the Edgar Fitzsimmons | Down at the Hatch                                                      | NC                                                     |
| 1859 | 7    | 1    | The Marinara Trench                | Lost and Found and Lost Again                                          | NC                                                     |
| 1870 | 8    | 0    | The Marinara Trench                | diving belle                                                           | banish: Bowl a Curveball                               |
| 1898 | 8    | 1    | The Marinara Trench                | Respect Your Elders                                                    | NC                                                     |
| 1905 | 9    | 0    | The Marinara Trench                | giant squid                                                            | free kill: BCZ Sweat Bullets                           |
| 1959 | 9    | 0    | The Marinara Trench                | giant squid                                                            | free kill: BCZ Sweat Bullets                           |
| 1994 | 9    | 0    | The Marinara Trench                | giant squid                                                            | free kill: BCZ Sweat Bullets                           |
| 2034 | 9    | 1    | The Marinara Trench                | You've Hit Bottom                                                      | NC                                                     |
| 2091 | 10   | 0    | Combat Lover's Locket              | Black Crayon Golem                                                     | free kill: Club Em                                     |
| 2169 | 10   | 0    | The Mer-Kin Outpost                | Mer-kin raider                                                         | banish: Bowl a Curveball                               |
| 2211 | 10   | 1    | The Mer-Kin Outpost                | A Walker and a Ranger, hold the Texas                                  | NC                                                     |
| 2223 | 11   | 1    | The Mer-Kin Outpost                | No Fuchsia For You                                                     | NC                                                     |
| 2230 | 12   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                               |
| 2280 | 12   | 0    | The Mer-Kin Outpost                | Mer-kin healer; Dart Perks                                             | darts bullseye                                         |
| 2341 | 12   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                           |
| 2392 | 12   | 1    | The Mer-Kin Outpost                | Obtuse Chartreuse                                                      | NC                                                     |
| 2413 | 13   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                               |
| 2459 | 13   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                               |
| 2496 | 13   | 1    | The Mer-Kin Outpost                | Granny, Does Your Dogfish Bite?                                        | NC                                                     |
| 2503 | 14   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                               |
| 2541 | 14   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                               |
| 2581 | 14   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                               |
| 2614 | 14   | 0    | The Mer-Kin Outpost                | Mer-kin raider                                                         | banish: Bowl a Curveball                               |
| 2642 | 14   | 0    | The Mer-Kin Outpost                | sausage goblin                                                         | free win                                               |
| 2682 | 14   | 0    | The Mer-Kin Outpost                | Mer-kin burglar                                                        | banish: Feel Hatred                                    |
| 2706 | 14   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                               |
| 2741 | 14   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                               |
| 2775 | 14   | 0    | The Mer-Kin Outpost                | Black Crayon Golem; Is There A Doctor In The House?                    | free win                                               |
| 2824 | 14   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | Patriotic Screech                                      |
| 2870 | 14   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | Patriotic Screech                                      |
| 2919 | 14   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | backup camera copy                                     |
| 2964 | 14   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | backup camera copy                                     |
| 3001 | 14   | 0    | The Mer-Kin Outpost                | Mer-kin raider                                                         | backup camera copy                                     |
| 3045 | 14   | 0    | The Mer-Kin Outpost                | Mer-kin raider                                                         | banish: Bowl a Curveball                               |
| 3071 | 14   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                           |
| 3112 | 14   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                           |
| 3142 | 14   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                           |
| 3198 | 14   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                           |
| 3233 | 14   | 1    | The Mer-Kin Outpost                | Into the Outpost; Mysterious Intent                                    | NC                                                     |
| 3248 | 15   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                           |
| 3287 | 15   | 1    | The Mer-Kin Outpost                | Into the Outpost; Mysterious Intent; Calling Rufus                     | NC                                                     |
| 3438 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | A Labyrinth of Shadows; A Labyrinth of Shadows; A Labyrinth of Shadows | NC                                                     |
| 3476 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | Like a Loded Stone                                                     | NC                                                     |
| 3522 | 16   | 0    | Combat Lover's Locket              | unholy diver; Using the Force                                          | saber Force                                            |
| 3560 | 16   | 0    | mimic egg                          | unholy diver; Using the Force                                          | saber Force                                            |
| 3654 | 16   | 0    | The Caliginous Abyss               | The Dark Cave of Dark Wonders, Through a Glass Darkly                  | NC                                                     |
| 3660 | 16   | 0    | numberology 69                     |                                                                        | prep                                                   |
| 3675 | 16   | 0    | The Caliginous Abyss               | eye in the darkness                                                    | free kill: Shattering Punch                            |
| 3725 | 16   | 0    | numberology 69                     |                                                                        | prep                                                   |
| 3757 | 16   | 0    | Cyberzone 1                        | eye in the darkness                                                    | cyber rock                                             |
| 3901 | 16   | 0    | Cyberzone 1                        | eye in the darkness                                                    | cyber rock                                             |
| 4056 | 16   | 0    | Cyberzone 1                        | purplehat hacker                                                       | free win                                               |
| 4101 | 16   | 0    | Cyberzone 1                        | eye in the darkness                                                    | cyber rock                                             |
| 4239 | 16   | 0    | Cyberzone 1                        | eye in the darkness                                                    | cyber rock                                             |
| 4376 | 16   | 0    | Cyberzone 1                        | eye in the darkness                                                    | cyber rock                                             |
| 4584 | 16   | 0    | The Coral Corral                   | sea cowboy                                                             | free kill: BCZ Sweat Bullets, backup camera copy       |
| 4683 | 16   | 0    | Smith 1 sea leather + 1 pants kit  |                                                                        | prep                                                   |
| 4699 | 16   | 0    | Smith 1 helmet recipe + 1 sea leat | Calling Rufus                                                          | NC                                                     |
| 4770 | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                   |
| 4778 | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                   |
| 4789 | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                   |
| 4791 | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                   |
| 4796 | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                   |
| 4798 | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                   |
| 4803 | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                   |
| 4805 | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                   |
| 4875 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow guy                                                             | free win                                               |
| 4935 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow guy                                                             | free win                                               |
| 4995 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow tree                                                            | free win                                               |
| 5050 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow tree                                                            | free win                                               |
| 5134 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow guy                                                             | free win                                               |
| 5216 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow tree                                                            | free win                                               |
| 5278 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow slab                                                            | free win                                               |
| 5417 | 16   | 0    | The Coral Corral                   | sea cow                                                                | banish: Bowl a Curveball                               |
| 5474 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow slab                                                            | free win                                               |
| 5588 | 16   | 0    | The Coral Corral                   | Mer-kin rustler                                                        | banish: Feel Hatred                                    |
| 5642 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow slab                                                            | free win                                               |
| 5761 | 16   | 0    | The Coral Corral                   | Mer-kin rustler                                                        | fight ended without a win (run/loss/cap)               |
| 5815 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow slab                                                            | free win                                               |
| 5910 | 16   | 0    | The Coral Corral                   | sea cowboy                                                             | fight ended without a win (run/loss/cap)               |
| 5961 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow guy                                                             | free win                                               |
| 6024 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | A Labyrinth of Shadows                                                 | NC                                                     |
| 6054 | 16   | 0    | The Coral Corral                   | sea cowboy                                                             | fight ended without a win (run/loss/cap)               |
| 6122 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow tree                                                            | free win                                               |
| 6183 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow slab                                                            | free win                                               |
| 6238 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow guy                                                             | free win                                               |
| 6288 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow tree                                                            | free win                                               |
| 6346 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow tree; Calling Rufus Back                                        | free win                                               |
| 6411 | 16   | 0    | Shadow Rift (The Misspelled Cemeta | Like a Loded Stone                                                     | NC                                                     |
| 6435 | 16   | 0    | Smith 1 waterlogged bootstraps + 1 |                                                                        | NC                                                     |
| 6562 | 16   | 0    | Mer-kin Elementary School          | Time is a Möbius Strip                                                 | NC                                                     |
| 6587 | 16   | 0    | Mer-kin Elementary School          | Mer-kin monitor                                                        | free kill: BCZ Sweat Bullets                           |
| 6637 | 16   | 1    | Mer-kin Elementary School          | <s>Woolly</s> Scaly Bully                                              | NC                                                     |
| 6649 | 17   | 0    | Mer-kin Elementary School          | Mer-kin teacher                                                        | free kill: Gingerbread Mob Hit, Macrometeorite re-roll |
| 6723 | 17   | 0    | Mer-kin Elementary School          | Mer-kin monitor                                                        | free kill: shadow brick                                |
| 6767 | 17   | 0    | Mer-kin Elementary School          | Mer-kin punisher                                                       | free kill: shadow brick, Macrometeorite re-roll        |
| 6831 | 17   | 0    | Mer-kin Elementary School          | Mer-kin teacher                                                        | free kill: shadow brick, Macrometeorite re-roll        |
| 6883 | 17   | 0    | Mer-kin Elementary School          | Mer-kin monitor                                                        | free kill: shadow brick                                |
| 6932 | 17   | 0    | Mer-kin Elementary School          | Mer-kin punisher                                                       | free kill: shadow brick, Macrometeorite re-roll        |
| 6989 | 17   | 0    | Mer-kin Elementary School          | Mer-kin punisher                                                       | free kill: shadow brick, Macrometeorite re-roll        |
| 7061 | 17   | 0    | Mer-kin Elementary School          | Mer-kin teacher                                                        | free kill: shadow brick, Macrometeorite re-roll        |
| 7113 | 17   | 0    | Mer-kin Elementary School          | Mer-kin punisher                                                       | free kill: shadow brick                                |
| 7159 | 17   | 0    | Mer-kin Elementary School          | time cop                                                               | free win                                               |
| 7205 | 17   | 1    | Mer-kin Elementary School          | A Mer-kin Graffiti                                                     | NC                                                     |
| 7270 | 18   | 1    | Mer-kin Elementary School          | Halls Passing in the Night                                             | NC                                                     |
| 7287 | 19   | 1    | Mer-kin Elementary School          | Halls Passing in the Night                                             | NC                                                     |
| 7331 | 20   | 0    | map to a candy-rich block          |                                                                        | NC                                                     |
| 7339 | 20   | 0    | Trick-or-Treating                  | Timmy Rotten, the Trespasser                                           | free win                                               |
| 7376 | 20   | 0    | Mer-kin Library                    | Black Crayon Golem                                                     | free win                                               |
| 7423 | 20   | 0    | Mer-kin Library                    | sausage goblin                                                         | free win                                               |
| 7465 | 20   | 0    | Mer-kin Library                    | Mer-kin alphabetizer                                                   | backup camera copy                                     |
| 7513 | 20   | 0    | Mer-kin Library                    | Mer-kin researcher; Using the Force                                    | saber Force                                            |
| 7538 | 20   | 0    | Mer-kin Library                    | Mer-kin drifter                                                        | backup camera copy                                     |
| 7592 | 20   | 0    | Mer-kin Library                    | Mer-kin drifter                                                        | backup camera copy                                     |
| 7641 | 20   | 1    | Mer-kin Library                    | Hook, Line and Sinker                                                  | NC                                                     |
| 7654 | 21   | 1    | Mer-kin dreadscroll                | Mer-kin Dreadscroll                                                    | NC                                                     |
| 7675 | 22   | 1    | The Skate Park                     | Sickpipe, the Skate Board Member                                       | NC                                                     |
| 7686 | 23   | 1    | The Skate Park                     | Prayer of the Roller Skates                                            | NC                                                     |
| 7719 | 24   | 0    | The Marinara Trench                | eye in the darkness                                                    | free win                                               |
| 7781 | 24   | 0    | The Caliginous Abyss               | eye in the darkness                                                    | free kill: Chest X-Ray                                 |
| 7834 | 24   | 1    | The Skate Park                     | Rollerbawl                                                             | NC                                                     |
| 7849 | 25   | 0    | Rest in your campaway tent         |                                                                        | prep                                                   |
| 7859 | 25   | 0    | Rest in your campaway tent         |                                                                        | prep                                                   |
| 7871 | 25   | 0    | The Skate Park                     | sausage goblin                                                         | free win                                               |
| 7928 | 25   | 0    | The Skate Park                     | sausage goblin                                                         | free win                                               |
| 7978 | 25   | 1    | The Skate Park                     | Holey Rollers                                                          | NC                                                     |
| 8053 | 26   | 1    | Mer-kin Temple (Right Door)        | They've Got Fun and Games; They've Got Everything You Want; Honey, The | paid kill                                              |
| 8207 | 27   | 1    | Mer-kin Gymnasium                  | Ators Gonna Ate                                                        | NC                                                     |
| 8239 | 28   | 1    | Mer-kin Gymnasium                  | Ators Gonna Ate                                                        | NC                                                     |
| 8253 | 29   | 0    | Mer-kin Gymnasium                  | Mer-kin juicer                                                         | banish: Bowl a Curveball                               |
| 8304 | 29   | 0    | Mer-kin Gymnasium                  | Mer-kin trainer                                                        | banish: latte                                          |
| 8340 | 29   | 0    | Mer-kin Gymnasium                  | Mer-kin poseur                                                         | banish: Feel Hatred                                    |
| 8371 | 29   | 1    | Mer-kin Gymnasium                  | Ators Gonna Ate                                                        | NC                                                     |
| 8388 | 30   | 0    | Mer-kin Gymnasium                  | Mer-kin poseur                                                         | banish: Snokebomb                                      |
| 8421 | 30   | 1    | Mer-kin Gymnasium                  | Ators Gonna Ate                                                        | NC                                                     |
| 8560 | 31   | 0    | Mer-kin Colosseum                  | Your Big Entrance                                                      | NC                                                     |
| 8577 | 31   | 0    | Mer-kin Colosseum                  | Mer-kin balldodger                                                     | free kill: Club Em                                     |
| 8637 | 31   | 0    | Mer-kin Colosseum                  | Mer-kin balldodger                                                     | free kill: Club Em                                     |
| 8700 | 31   | 0    | Mer-kin Colosseum                  | Mer-kin netdragger                                                     | free kill: Club Em                                     |
| 8772 | 31   | 0    | Mer-kin Colosseum                  | Mer-kin bladeswitcher                                                  | free kill: Club Em                                     |
| 8836 | 31   | 0    | Mer-kin Colosseum                  | Mer-kin balldodger                                                     | free kill: Club Em                                     |
| 8903 | 31   | 1    | Mer-kin Colosseum                  | Mer-kin netdragger                                                     | paid kill                                              |
| 8971 | 32   | 0    | The Marinara Trench                | eye in the darkness                                                    | free win                                               |
| 9048 | 32   | 0    | Mer-kin Colosseum                  | Mer-kin bladeswitcher                                                  | free win                                               |
| 9109 | 32   | 0    | Mer-kin Colosseum                  | Mer-kin balldodger                                                     | free win                                               |
| 9154 | 32   | 1    | Mer-kin Colosseum                  | Mer-kin netdragger                                                     | paid kill                                              |
| 9201 | 33   | 1    | Mer-kin Colosseum                  | Mer-kin bladeswitcher                                                  | paid kill                                              |
| 9236 | 34   | 1    | Mer-kin Colosseum                  | Mer-kin balldodger                                                     | paid kill                                              |
| 9276 | 35   | 1    | Mer-kin Colosseum                  | Mer-kin netdragger                                                     | paid kill                                              |
| 9334 | 36   | 0    | Mer-kin Colosseum                  | Mer-kin bladeswitcher                                                  | free win                                               |
| 9372 | 36   | 1    | Mer-kin Colosseum                  | Georgepaul, the Balldodger                                             | paid kill                                              |
| 9409 | 37   | 1    | Mer-kin Colosseum                  | Johnringo, the Netdragger                                              | paid kill                                              |
| 9446 | 38   | 0    | Mer-kin Colosseum                  | Been There, Won That                                                   | NC                                                     |
| 9481 | 38   | 1    | The Caliginous Abyss               | Peanut                                                                 | free kill: shadow brick                                |
| 9523 | 39   | 1    | The Caliginous Abyss               | school of many                                                         | paid kill                                              |
| 9568 | 40   | 0    | The Caliginous Abyss               | slithering thing                                                       | free kill: shadow brick                                |
| 9633 | 40   | 0    | The Caliginous Abyss               | eye in the darkness                                                    | free kill: shadow brick                                |
| 9667 | 40   | 1    | The Caliginous Abyss               | Yo' Mama So Possessed By Evil . . .                                    | NC                                                     |
| 9715 | 41   | 1    | Mer-kin Temple (Left Door)         | In The Temple of Violence, Shine Like Thunder; Flex Your Pecs in the N | paid kill                                              |
| 9855 | 42   | 0    | Mer-kin Temple (Center Door)       | The Mer-Kin Deepcity                                                   | NC                                                     |
| 9870 | 42   | 0    | Mer-kin Temple (Center Door)       | The Nautical Seaceress; The Council of Loathing                        | backup dancer                                          |

Blocks: 173. Paid turns: 41.
