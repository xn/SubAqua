# Appendix B. SubAqua 2026-09-02, every marker

Source: `docs/2026-09-02-run.txt`. One row per `[N]` marker. **cost** = next marker's N minus this one (1 = this block spent a turn; 0 = free; last block: 0 if it printed `This combat did not cost a turn`, else 1). **ended by** is read from the block's own action lines; blank on a free win means the fight was free by zone or by wanderer type (goblin, golem copy, rift, cyber, locket, time cop).

| line  | turn | cost | zone                               | encounter                                                              | ended by                                             |
| ----- | ---- | ---- | ---------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| 1104  | 1    | 1    | The Haunted Pantry                 | Spirit of the Dolphin King                                             | NC                                                   |
| 1116  | 2    | 0    | The Haunted Pantry                 | The Baker's Dilemma                                                    | NC                                                   |
| 1127  | 2    | 0    | The Haunted Pantry                 | undead elbow macaroni                                                  | free run: Spring Away                                |
| 1184  | 2    | 1    | The Haunted Pantry                 | possessed can of tomatoes; Dart Perks                                  | darts bullseye                                       |
| 1264  | 3    | 1    | The Haunted Pantry                 | Oh No, Hobo; drunken half-orc hobo                                     | darts bullseye                                       |
| 1325  | 4    | 0    | The Haunted Pantry                 | The Singing Tree                                                       | NC                                                   |
| 1336  | 4    | 0    | The Haunted Pantry                 | The Baker's Dilemma                                                    | NC                                                   |
| 1347  | 4    | 0    | The Haunted Pantry                 | Black Crayon Fish; Dart Perks                                          | darts bullseye                                       |
| 1411  | 4    | 1    | The Haunted Pantry                 | A Sandwich Appears!                                                    | NC                                                   |
| 1615  | 5    | 0    | An Octopus's Garden                | Neptune flytrap                                                        | free kill: Shattering Punch, darts bullseye          |
| 1759  | 5    | 1    | The Wreck of the Edgar Fitzsimmons | Down at the Hatch                                                      | NC                                                   |
| 1830  | 6    | 0    | The Marinara Trench                | Mer-kin diver                                                          | banish: Bowl a Curveball                             |
| 1854  | 6    | 0    | The Marinara Trench                | fisherfish                                                             | darts bullseye, banish: Feel Hatred                  |
| 1933  | 6    | 1    | The Marinara Trench                | Lost and Found and Lost Again                                          | NC                                                   |
| 1943  | 7    | 1    | The Marinara Trench                | Respect Your Elders                                                    | NC                                                   |
| 1953  | 8    | 1    | The Marinara Trench                | You've Hit Bottom                                                      | NC                                                   |
| 1998  | 9    | 0    | Combat Lover's Locket              | Black Crayon Golem                                                     | free kill: Club Em                                   |
| 2063  | 9    | 1    | The Mer-Kin Outpost                | A Walker and a Ranger, hold the Texas                                  | NC                                                   |
| 2097  | 10   | 1    | The Mer-Kin Outpost                | No Fuchsia For You                                                     | NC                                                   |
| 2108  | 11   | 1    | The Mer-Kin Outpost                | Obtuse Chartreuse                                                      | NC                                                   |
| 2126  | 12   | 1    | The Mer-Kin Outpost                | Granny, Does Your Dogfish Bite?                                        | NC                                                   |
| 2137  | 13   | 0    | The Mer-Kin Outpost                | Black Crayon Golem; Dart Perks                                         | darts bullseye                                       |
| 2194  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin raider                                                         | fight ended without a win (run/loss/cap)             |
| 2219  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free win                                             |
| 2275  | 13   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                             |
| 2326  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin burglar                                                        | banish: Bowl a Curveball                             |
| 2352  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin burglar                                                        | banish: Feel Hatred                                  |
| 2381  | 13   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                             |
| 2434  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: Chest X-Ray                               |
| 2478  | 13   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                             |
| 2530  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: Chest X-Ray                               |
| 2569  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: Chest X-Ray                               |
| 2613  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                         |
| 2670  | 13   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                             |
| 2720  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                         |
| 2765  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                         |
| 2805  | 13   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                             |
| 2855  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                         |
| 2893  | 13   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                             |
| 2939  | 13   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                             |
| 2986  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                         |
| 3023  | 13   | 0    | The Mer-Kin Outpost                | Black Crayon Golem                                                     | free win                                             |
| 3077  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                         |
| 3117  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                         |
| 3190  | 13   | 0    | The Mer-Kin Outpost                | Mer-kin healer                                                         | free kill: BCZ Sweat Bullets                         |
| 3228  | 13   | 1    | The Mer-Kin Outpost                | Into the Outpost; Mysterious Intent                                    | NC                                                   |
| 3299  | 14   | 0    | The Mer-Kin Outpost                | Mer-kin healer; Using the Force                                        | fight ended without a win (run/loss/cap)             |
| 3439  | 14   | 0    | Combat Lover's Locket              | unholy diver; Using the Force                                          | fight ended without a win (run/loss/cap)             |
| 3478  | 14   | 0    | mimic egg                          | unholy diver; Using the Force                                          | fight ended without a win (run/loss/cap)             |
| 3560  | 14   | 0    | Cyberzone 1                        | firewall                                                               | fight ended without a win (run/loss/cap)             |
| 3677  | 14   | 0    | Cyberzone 1                        | Black Crayon Golem                                                     | Patriotic Screech                                    |
| 3737  | 14   | 0    | Madness Bakery                     | Our Bakery in the Middle of Our Street                                 | NC                                                   |
| 3745  | 14   | 1    | Madness Bakery                     | baguette lady                                                          | Patriotic Screech                                    |
| 3870  | 15   | 0    | The Caliginous Abyss               | The Dark Cave of Dark Wonders, Through a Glass Darkly                  | NC                                                   |
| 3881  | 15   | 1    | The Caliginous Abyss               | eye in the darkness                                                    | paid kill                                            |
| 3962  | 16   | 0    | Cyberzone 1                        | eye in the darkness                                                    | cyber rock, fight ended without a win (run/loss/cap) |
| 4093  | 16   | 0    | Cyberzone 1                        | purplehat hacker                                                       | free win                                             |
| 4134  | 16   | 0    | Cyberzone 1                        | eye in the darkness                                                    | cyber rock                                           |
| 4275  | 16   | 0    | Cyberzone 1                        | purplehat hacker                                                       | free win                                             |
| 4311  | 16   | 0    | Cyberzone 1                        | eye in the darkness                                                    | cyber rock, fight ended without a win (run/loss/cap) |
| 4437  | 16   | 0    | Cyberzone 1                        | eye in the darkness                                                    | cyber rock, fight ended without a win (run/loss/cap) |
| 4575  | 16   | 0    | Cyberzone 1                        | eye in the darkness; Calling Rufus                                     | cyber rock, fight ended without a win (run/loss/cap) |
| 4801  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | A Labyrinth of Shadows; Summon a Wave; Calling Rufus Back              | NC                                                   |
| 4842  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | Like a Loded Stone; Calling Rufus                                      | NC                                                   |
| 4914  | 16   | 0    | The Coral Corral                   | sea cow                                                                | free kill: BCZ Sweat Bullets, backup camera copy     |
| 4996  | 16   | 0    | Smith 1 sea leather + 1 pants kit  |                                                                        | prep                                                 |
| 5015  | 16   | 0    | Smith 1 helmet recipe + 1 sea leat |                                                                        | prep                                                 |
| 5052  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow guy                                                             | free win                                             |
| 5116  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow slab                                                            | free win                                             |
| 5208  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow tree                                                            | free win                                             |
| 5268  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow guy                                                             | free win                                             |
| 5352  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow slab                                                            | free win                                             |
| 5417  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow guy                                                             | free win                                             |
| 5488  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow slab                                                            | free win                                             |
| 5562  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow guy                                                             | free win                                             |
| 5629  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow tree                                                            | free win                                             |
| 5698  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow guy                                                             | free win                                             |
| 5747  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow tree                                                            | free win                                             |
| 5808  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | A Labyrinth of Shadows; A Labyrinth of Shadows; A Labyrinth of Shadows | NC                                                   |
| 5845  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | Like a Loded Stone                                                     | NC                                                   |
| 5861  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow slab                                                            | free win                                             |
| 5939  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow tree                                                            | free win                                             |
| 6014  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow tree                                                            | free win                                             |
| 6082  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow guy                                                             | free win                                             |
| 6136  | 16   | 0    | Shadow Rift (The Misspelled Cemeta | shadow slab                                                            | free win                                             |
| 6252  | 16   | 0    | The Coral Corral                   | Mer-kin rustler                                                        | banish: Bowl a Curveball                             |
| 6279  | 16   | 0    | The Coral Corral                   | sea cowboy                                                             | banish: Feel Hatred                                  |
| 6307  | 16   | 0    | The Coral Corral                   | sea cow                                                                | free kill: BCZ Sweat Bullets                         |
| 6350  | 16   | 0    | The Coral Corral                   | wild seahorse                                                          | fight ended without a win (run/loss/cap)             |
| 6429  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6437  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6442  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6444  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6450  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6452  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6457  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6459  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6464  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6466  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6480  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6482  | 16   | 0    | Anemone Mine (Mining)              |                                                                        | prep                                                 |
| 6506  | 16   | 0    | Smith 1 waterlogged bootstraps + 1 |                                                                        | NC                                                   |
| 6556  | 16   | 0    | Mer-kin Elementary School          | Mer-kin punisher                                                       | free kill: BCZ Sweat Bullets                         |
| 6624  | 16   | 0    | Mer-kin Elementary School          | Mer-kin teacher                                                        | free kill: Shattering Punch                          |
| 6673  | 16   | 0    | Mer-kin Elementary School          | Mer-kin teacher                                                        | free kill: Shattering Punch                          |
| 6721  | 16   | 0    | Mer-kin Elementary School          | Mer-kin punisher                                                       | free kill: Gingerbread Mob Hit                       |
| 6768  | 16   | 0    | Mer-kin Elementary School          | Mer-kin monitor                                                        | free kill: shadow brick                              |
| 6809  | 16   | 0    | Mer-kin Elementary School          | Mer-kin punisher                                                       | free kill: shadow brick                              |
| 6864  | 16   | 1    | Mer-kin Elementary School          | <s>Woolly</s> Scaly Bully                                              | NC                                                   |
| 6917  | 17   | 0    | The Marinara Trench                | Black Crayon Golem                                                     | free win                                             |
| 6994  | 17   | 1    | Mer-kin Elementary School          | A Mer-kin Graffiti                                                     | NC                                                   |
| 7013  | 18   | 1    | Mer-kin Elementary School          | Halls Passing in the Night                                             | NC                                                   |
| 7028  | 19   | 1    | Mer-kin Elementary School          | Halls Passing in the Night                                             | NC                                                   |
| 7080  | 20   | 0    | Mer-kin Library                    | sausage goblin                                                         | backup camera copy                                   |
| 7140  | 20   | 0    | Mer-kin Library                    | Mer-kin drifter                                                        | backup camera copy                                   |
| 7189  | 20   | 0    | Mer-kin Library                    | Mer-kin alphabetizer                                                   | backup camera copy                                   |
| 7239  | 20   | 0    | Mer-kin Library                    | Mer-kin drifter                                                        | backup camera copy                                   |
| 7289  | 20   | 0    | Mer-kin Library                    | Mer-kin researcher                                                     | backup camera copy                                   |
| 7338  | 20   | 1    | Mer-kin Library                    | Hook, Line and Sinker                                                  | NC                                                   |
| 7347  | 21   | 1    | Mer-kin dreadscroll                | Mer-kin Dreadscroll                                                    | NC                                                   |
| 7438  | 22   | 0    | Mer-kin Temple (Right Door)        | They've Got Fun and Games; They've Got Everything You Want; Honey, The | free win                                             |
| 7641  | 22   | 0    | Mer-kin Gymnasium                  | Mer-kin trainer                                                        | banish: Bowl a Curveball, Avalanche (NC forcer)      |
| 7680  | 22   | 1    | The Skate Park                     | Sickpipe, the Skate Board Member                                       | NC                                                   |
| 7728  | 23   | 0    | The Marinara Trench                | eye in the darkness                                                    | free win                                             |
| 7767  | 23   | 1    | The Skate Park                     | Picking Sides                                                          | NC                                                   |
| 7818  | 24   | 0    | Mer-kin Gymnasium                  | Mer-kin poseur                                                         | banish: latte, Avalanche (NC forcer)                 |
| 7859  | 24   | 1    | The Skate Park                     | Prayer of the Roller Skates                                            | NC                                                   |
| 7883  | 25   | 0    | Mer-kin Gymnasium                  | Mer-kin juicer                                                         | banish: Snokebomb, Avalanche (NC forcer)             |
| 7927  | 25   | 1    | The Skate Park                     | Rollerbawl                                                             | NC                                                   |
| 7956  | 26   | 1    | Mer-kin Gymnasium                  | Ators Gonna Ate                                                        | NC                                                   |
| 8007  | 27   | 0    | Mer-kin Gymnasium                  | Mer-kin juicer                                                         | banish: Snokebomb                                    |
| 8063  | 27   | 0    | Mer-kin Gymnasium                  | Mer-kin poseur                                                         | banish: Snokebomb                                    |
| 8122  | 27   | 1    | Mer-kin Gymnasium                  | Ators Gonna Ate                                                        | NC                                                   |
| 8152  | 28   | 0    | Mer-kin Gymnasium                  | Mer-kin juicer                                                         | fight ended without a win (run/loss/cap)             |
| 8193  | 28   | 0    | Mer-kin Gymnasium                  | Mer-kin juicer                                                         | fight ended without a win (run/loss/cap)             |
| 8234  | 28   | 1    | Mer-kin Gymnasium                  | Ators Gonna Ate                                                        | NC                                                   |
| 8264  | 29   | 1    | Mer-kin Gymnasium                  | Ators Gonna Ate                                                        | NC                                                   |
| 8293  | 30   | 0    | Mer-kin Gymnasium                  | Mer-kin juicer                                                         | fight ended without a win (run/loss/cap)             |
| 8338  | 30   | 0    | Mer-kin Gymnasium                  | Mer-kin juicer                                                         | fight ended without a win (run/loss/cap)             |
| 8377  | 30   | 0    | Mer-kin Gymnasium                  | Mer-kin juicer                                                         | fight ended without a win (run/loss/cap)             |
| 8416  | 30   | 0    | Mer-kin Gymnasium                  | Mer-kin juicer                                                         | banish: Bowl a Curveball                             |
| 8459  | 30   | 1    | Mer-kin Gymnasium                  | Ators Gonna Ate                                                        | NC                                                   |
| 8508  | 31   | 1    | The Skate Park                     | Holey Rollers                                                          | NC                                                   |
| 8624  | 32   | 0    | Mer-kin Colosseum                  | Your Big Entrance                                                      | NC                                                   |
| 8653  | 32   | 0    | Mer-kin Colosseum                  | Mer-kin balldodger                                                     | free kill: Club Em                                   |
| 8725  | 32   | 0    | Mer-kin Colosseum                  | Mer-kin balldodger                                                     | free kill: Club Em                                   |
| 8796  | 32   | 0    | Mer-kin Colosseum                  | Mer-kin netdragger                                                     | free kill: Club Em                                   |
| 8877  | 32   | 0    | Mer-kin Colosseum                  | Mer-kin bladeswitcher                                                  | free kill: Club Em                                   |
| 9109  | 32   | 0    | Mer-kin Colosseum                  | Mer-kin balldodger                                                     | free kill: Club Em                                   |
| 9186  | 32   | 1    | Mer-kin Colosseum                  | Mer-kin netdragger                                                     | paid kill                                            |
| 9235  | 33   | 0    | Mer-kin Colosseum                  | Mer-kin bladeswitcher                                                  | free win                                             |
| 9284  | 33   | 1    | Mer-kin Colosseum                  | Mer-kin balldodger                                                     | paid kill                                            |
| 9328  | 34   | 1    | Mer-kin Colosseum                  | Mer-kin netdragger                                                     | paid kill                                            |
| 9372  | 35   | 1    | Mer-kin Colosseum                  | Mer-kin bladeswitcher                                                  | paid kill                                            |
| 9428  | 36   | 1    | Mer-kin Colosseum                  | Mer-kin balldodger                                                     | paid kill                                            |
| 9487  | 37   | 1    | Mer-kin Colosseum                  | Mer-kin netdragger                                                     | paid kill                                            |
| 9529  | 38   | 1    | Mer-kin Colosseum                  | Mer-kin bladeswitcher                                                  | paid kill                                            |
| 9574  | 39   | 1    | Mer-kin Colosseum                  | Georgepaul, the Balldodger                                             | paid kill                                            |
| 9622  | 40   | 1    | Mer-kin Colosseum                  | Johnringo, the Netdragger                                              | paid kill                                            |
| 9668  | 41   | 0    | Mer-kin Colosseum                  | Been There, Won That                                                   | NC                                                   |
| 9738  | 41   | 1    | The Caliginous Abyss               | Peanut                                                                 | paid kill                                            |
| 9790  | 42   | 0    | The Caliginous Abyss               | eye in the darkness                                                    | free kill: Assert your Authority                     |
| 9831  | 42   | 1    | The Caliginous Abyss               | school of many                                                         | paid kill                                            |
| 9879  | 43   | 0    | The Caliginous Abyss               | slithering thing                                                       | free kill: Assert your Authority                     |
| 9917  | 43   | 0    | The Caliginous Abyss               | eye in the darkness                                                    | free kill: Assert your Authority                     |
| 9957  | 43   | 0    | The Caliginous Abyss               | slithering thing                                                       | free kill: shadow brick                              |
| 9992  | 43   | 0    | The Caliginous Abyss               | eye in the darkness                                                    | free kill: shadow brick                              |
| 10028 | 43   | 0    | The Caliginous Abyss               | eye in the darkness                                                    | free kill: shadow brick                              |
| 10058 | 43   | 0    | The Caliginous Abyss               | slithering thing                                                       | free kill: shadow brick                              |
| 10093 | 43   | 0    | The Caliginous Abyss               | eye in the darkness                                                    | free kill: shadow brick                              |
| 10125 | 43   | 0    | The Caliginous Abyss               | slithering thing                                                       | free kill: shadow brick                              |
| 10159 | 43   | 0    | The Caliginous Abyss               | slithering thing                                                       | free kill: shadow brick                              |
| 10193 | 43   | 0    | The Caliginous Abyss               | slithering thing                                                       | free kill: shadow brick                              |
| 10224 | 43   | 0    | The Caliginous Abyss               | eye in the darkness                                                    | free kill: shadow brick                              |
| 10258 | 43   | 0    | The Caliginous Abyss               | eye in the darkness                                                    | free kill: shadow brick                              |
| 10290 | 43   | 1    | The Caliginous Abyss               | Yo' Mama So Possessed By Evil . . .                                    | NC                                                   |
| 10366 | 44   | 1    | Mer-kin Temple (Left Door)         | In The Temple of Violence, Shine Like Thunder; Flex Your Pecs in the N | paid kill                                            |
| 10530 | 45   | 0    | Mer-kin Temple (Center Door)       | The Mer-Kin Deepcity                                                   | NC                                                   |
| 10540 | 45   | 1    | Mer-kin Temple (Center Door)       | The Nautical Seaceress; The Council of Loathing                        | backup dancer                                        |

Blocks: 179. Paid turns: 45.
