export default (s1: string, s2: string) => {
	if (s1 === s2) return 1;

	const dec = (str: string) =>
		str.split('').map((v) =>
			/[가-힣]/.test(v)
				? v
						.normalize('NFD')
						.split('')
						.map((a) => a.charCodeAt(0))
						.map((a, i) =>
							i
								? i - 1
									? ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'[
											a - 4519
									  ]
									: 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'[a - 4449]
								: 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[a - 4352]
						)
						.join('')
				: v
		);

	const similar = (s1: string, s2: string): number => {
		if (s2.length > s1.length) return similar(s2, s1);
		if (s2.length === 0) return 0;

		let d = Array(s2.length + 1)
			.fill(undefined)
			.map((v, i) =>
				i
					? [i]
					: Array(s1.length + 1)
							.fill(undefined)
							.map((v, j) => j)
			);

		for (let i = 1; i <= s2.length; i++) {
			for (let j = 1; j <= s1.length; j++) {
				d[i][j] = Math.min(
					d[i][j - 1] + 1,
					d[i - 1][j] + 1,
					d[i - 1][j - 1] + (s2[i - 1] != s1[j - 1] ? 1 : 0)
				);
			}
		}

		return (
			1 - parseInt(((d[s2.length][s1.length] / s1.length) * 10).toString()) / 10
		);
	};

	return similar(
		dec('1' + s1)
			.slice(1)
			.join(''),
		dec('2' + s2)
			.slice(1)
			.join('')
	);
};
