const live = [
  // [name, cat, quality]
  ['TRT 1 HD', 'gen'], ['4K: TRT 4K', 'gen'], ['TRT 2', 'gen'], ['TRT Türk', 'gen'], ['TRT Avaz', 'gen'], ['TRT World HD', 'gen'],
  ['TRT Haber HD', 'news'], ['DW English', 'news'], ['France 24 English', 'news'], ['Euronews', 'news'], ['Al Jazeera English', 'news'], ['Bloomberg TV', 'news'], ['NHK World Japan', 'news'], ['CGTN', 'news'],
  ['TRT Spor HD', 'sport'], ['TRT Spor Yıldız HD', 'sport'], ['Red Bull TV', 'sport'], ['FIFA+ Live', 'sport'],
  ['TRT Belgesel HD', 'doc'], ['NASA TV', 'doc'], ['4K: NASA TV UHD', 'doc'], ['DW Documentary', 'doc'],
  ['TRT Çocuk', 'kids'], ['TRT Diyanet Çocuk', 'kids'],
  ['TRT Müzik', 'music'], ['TRT Kurdî', 'music']
];
const cats = { gen: 'General', news: 'News', sport: 'Sports', doc: 'Documentary', kids: 'Kids', music: 'Music' };
const epg = {
  gen: ['Morning Show', 'Evening News', 'Prime Time Drama', 'Talk of the Day', 'Weekend Cinema', 'Cooking Hour', 'Late Night'],
  news: ['World News', 'Business Today', 'Global Report', 'Headlines', 'Debate', 'Weather & Markets', 'Inside Story'],
  sport: ['Match Day Live', 'Sports Centre', 'Highlights', 'Basketball Live', 'Extreme Sports', 'Football Talk', 'Tennis Weekly'],
  doc: ['Space Station Live', 'Planet Oceans', 'Wild Africa', 'History Revealed', 'Mission Control', 'Ancient Cities', 'Deep Earth'],
  kids: ['Cartoon Club', 'Little Explorers', 'Story Time', 'Science for Kids', 'Animal Friends', 'Draw with Us', 'Good Night'],
  music: ['Top 20', 'Live Session', 'Classics', 'Folk Hour', 'New Releases', 'Night Mix', 'Concert']
};
const movies = [
  ['Big Buck Bunny', 2008, 'Animation, Comedy', 7.2, '00:10:00', 'Sacha Goedegebure', 'Open-source Blender film', 'A gentle giant rabbit decides he has had enough of three rodents who keep tormenting the forest.', '#7BB661', '#2F5E2A'],
  ['Sintel', 2010, 'Animation, Fantasy', 7.5, '00:15:00', 'Colin Levy', 'Halina Reijn, Thom Hoffman', 'A lonely young woman crosses snowfields and cities in search of the baby dragon she once nursed back to health.', '#C9D6E8', '#3B4C6B'],
  ['Tears of Steel', 2012, 'Sci-Fi, Action', 6.4, '00:12:00', 'Ian Hubert', 'Derek de Lint, Sergio Hasselbaink', 'In a future Amsterdam, a group of scientists try to save the world by replaying a painful breakup.', '#5FC7D9', '#122A3A'],
  ['Spring', 2019, 'Animation, Fantasy', 7.9, '00:08:00', 'Andy Goralczyk', 'Open-source Blender film', 'A shepherd girl and her dog face ancient spirits to bring the cycle of life back to their valley.', '#F2B5C8', '#3F2A4F'],
  ['Cosmos Laundromat', 2015, 'Animation, Comedy', 7.1, '00:12:00', 'Mathieu Auvray', 'Pierre Bokma, Reinout Scholten van Aschat', 'A suicidal sheep on a desolate island meets a mysterious salesman who offers him the gift of a lifetime.', '#E3B23C', '#3A2A17'],
  ['Elephants Dream', 2006, 'Animation, Sci-Fi', 6.0, '00:11:00', 'Bassam Kurdali', 'Tygo Gernandt, Cas Jansen', 'Two strange characters explore a vast mechanical world that seems to rebuild itself around them.', '#C77D3B', '#2A1D14'],
  ['Metropolis', 1927, 'Sci-Fi, Drama', 8.3, '02:33:00', 'Fritz Lang', 'Brigitte Helm, Alfred Abel, Gustav Fröhlich', 'In a towering city of the future, the son of the city’s ruler falls for a woman who speaks for the workers below.', '#D9C27A', '#1D1B16'],
  ['Nosferatu', 1922, 'Horror, Fantasy', 7.8, '01:34:00', 'F. W. Murnau', 'Max Schreck, Gustav von Wangenheim', 'An estate agent travels to the remote castle of a strange count, unaware of what will follow him home.', '#9FB3A4', '#141A17'],
  ['The General', 1926, 'Comedy, Action', 8.1, '01:18:00', 'Buster Keaton, Clyde Bruckman', 'Buster Keaton, Marion Mack', 'A train engineer chases the soldiers who stole his beloved locomotive — and, accidentally, his girlfriend.', '#E0A458', '#2B2117'],
  ['Night of the Living Dead', 1968, 'Horror, Thriller', 7.8, '01:36:00', 'George A. Romero', 'Duane Jones, Judith O’Dea', 'Strangers barricade themselves in a farmhouse as the dead begin to rise across the countryside.', '#B8B8B8', '#151515'],
  ['Charade', 1963, 'Comedy, Mystery, Romance', 7.9, '01:53:00', 'Stanley Donen', 'Cary Grant, Audrey Hepburn, Walter Matthau', 'After her husband is murdered, a woman in Paris is pursued by several men who want the fortune he stole.', '#E86A5C', '#2C1A1E'],
  ['His Girl Friday', 1940, 'Comedy, Romance', 7.8, '01:32:00', 'Howard Hawks', 'Cary Grant, Rosalind Russell', 'A newspaper editor uses every trick he knows to win back his star reporter — who is also his ex-wife.', '#EAD7B7', '#2E2620'],
  ['The Kid', 1921, 'Comedy, Drama', 8.2, '01:08:00', 'Charlie Chaplin', 'Charlie Chaplin, Jackie Coogan', 'The Tramp finds an abandoned baby and raises him, until the authorities try to take the boy away.', '#C9B79C', '#22201C'],
  ['Sherlock Jr.', 1924, 'Comedy, Action', 8.2, '00:45:00', 'Buster Keaton', 'Buster Keaton, Kathryn McGuire', 'A projectionist who dreams of being a detective walks straight into the film he is screening.', '#A9C7C4', '#1A2423'],
  ['A Trip to the Moon', 1902, 'Adventure, Sci-Fi', 8.1, '00:13:00', 'Georges Méliès', 'Georges Méliès, Bleuette Bernon', 'A group of astronomers fire themselves at the Moon in a giant shell and meet its strange inhabitants.', '#F3E3A0', '#1E2140'],
  ['The Cabinet of Dr. Caligari', 1920, 'Horror, Mystery', 8.0, '01:16:00', 'Robert Wiene', 'Werner Krauss, Conrad Veidt', 'A traveling showman and his sleepwalking servant arrive in a small town just as a series of murders begins.', '#C2A36B', '#221A10'],
  ['Detour', 1945, 'Crime, Film-Noir', 7.2, '01:08:00', 'Edgar G. Ulmer', 'Tom Neal, Ann Savage', 'A pianist hitchhiking across America is pulled into a nightmare after a fatal accident on the road.', '#8FA3BF', '#131821'],
  ['Carnival of Souls', 1962, 'Horror, Mystery', 7.0, '01:18:00', 'Herk Harvey', 'Candace Hilligoss, Frances Feist', 'After surviving a car accident, a church organist is drawn to an abandoned lakeside pavilion.', '#B6C2C9', '#161B1F']
];
const series = [
  ['Sherlock Holmes', 1954, 'Crime, Mystery', 7.3, 'The great detective and Dr. Watson solve baffling cases in Victorian London.', '#C9A66B', '#1F1A14', 1, 13],
  ['Flash Gordon', 1954, 'Sci-Fi, Adventure', 6.2, 'Flash Gordon and his friends patrol the galaxy for the Galactic Bureau of Investigation.', '#6FB7E8', '#121C33', 1, 13],
  ['The Cisco Kid', 1950, 'Western, Adventure', 7.0, 'A charming caballero and his loyal sidekick ride the Old West righting wrongs.', '#E2A55B', '#2A1C10', 3, 10],
  ['Annie Oakley', 1954, 'Western, Family', 6.8, 'The sharpshooting heroine keeps the peace in the frontier town of Diablo.', '#D98E73', '#2A1712', 2, 10],
  ['The Lucy Show', 1962, 'Comedy, Family', 7.2, 'A widowed mother and her best friend get into one comic predicament after another.', '#F4B6C2', '#2E1B24', 2, 12],
  ['One Step Beyond', 1959, 'Drama, Fantasy', 7.6, 'Dramatised accounts of unexplained events, introduced by a calm host.', '#9CA6D9', '#16182B', 3, 12],
  ['Petticoat Junction', 1963, 'Comedy, Family', 6.9, 'Life at a small country hotel run by a widow and her three daughters.', '#A7D39B', '#18261A', 2, 12],
  ['Bonanza', 1959, 'Western, Drama', 7.4, 'A rancher and his three sons protect their vast Nevada ranch and their neighbours.', '#E3C27A', '#2A2213', 4, 10]
];
module.exports = { live, cats, epg, movies, series };
