// Canonical data/qualification/export/discovery gate. Not a native or semantic review.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {PIN,ASSET,ORDER,authenticateEdition,validateProjection,fullBodyPayload} from '../public/qualified-sichos-221230-core.mjs';
import {loadEdition,plainExport} from '../src/lib/qualified-sichos-221230.mjs';
import {GET,getStaticPaths} from '../src/pages/reader-plain/reviewed/sichos-221-230/[format].js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const EXPECTED=[
  {
    "owner": "sichos-221-position-0",
    "source_index": 1,
    "array_position": 0,
    "fields": {
      "en": "7c5a89133d1fbc0af1f727c6f20f3ef55a78be8d1c2412559ea67d648d060dc9",
      "he": "8c0ddcb74ae37b6e4905c167ec186fcc783ac57009163aa380e9b35470af3b2f",
      "he_nikud": "1c5e9368b6427d423b937f1da327efb8a25f15ac173f57541d1f6aac7565cd31"
    },
    "qualification_ids": [
      "sichos-221-position-0-qualification-0",
      "sichos-221-position-0-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-221-position-1",
    "source_index": 2,
    "array_position": 1,
    "fields": {
      "en": "8f6c062d47241926fcf0a3075c4b3fd60ec30eda9f2a875f8f53e1d58aad0c50",
      "he": "510a58db6dfda37de20c47a842a9876c9332a9e6bd1512764d0c75f4e8abfcda",
      "he_nikud": "020e425b8cda69b2a0af6ac448cba0f5c4ab1f061b8b66acf6e7a792de892cae"
    },
    "qualification_ids": [
      "sichos-221-position-1-qualification-0",
      "sichos-221-position-1-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-221-position-3",
    "source_index": 4,
    "array_position": 3,
    "fields": {
      "en": "69f13dfed92d352ff8a191ff80b371a5ba86f64c3559c9e2c6055160c8737245",
      "he": "6264ad26ecf82590a38a34add5659e47426dab56bbd897979aacd8ab968f5833",
      "he_nikud": "dd10ba090e300c3a8abf1b418f2dbcf38bd1bc9df7fd435e3eec8a2446a4ef36"
    },
    "qualification_ids": [
      "sichos-221-position-3-qualification-0",
      "sichos-221-position-3-qualification-1",
      "sichos-221-position-3-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "bbb87826becb5336392faf551595a56ac29c4c277668774707bfac84abda300c"
    ]
  },
  {
    "owner": "sichos-222-position-0",
    "source_index": 1,
    "array_position": 0,
    "fields": {
      "en": "a365d6acd8fadce886675b4c15a97a284bd6543a18200a0c0ae0e02789c447cb",
      "he": "e622e5b55264497f82ce9d89ce363825d35e7c6e89d2eff45fe296b7d734d952",
      "he_nikud": "addac2578589280d325e3fe02b30b6df9768ee19edf6f8315dbfd143fd8b145d"
    },
    "qualification_ids": [
      "sichos-222-position-0-qualification-0",
      "sichos-222-position-0-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-222-position-1",
    "source_index": 2,
    "array_position": 1,
    "fields": {
      "en": "708ac360e4a78d5d59b5df471aef342bfeb08d7ede247d2b47dfa432bb62ec4d",
      "he": "ca2d18c22e4b553ac21dacd477665d515b2d154fbebf41dc4e284d8f8a6e5213",
      "he_nikud": "b11d4ffd1bcc33318003f7ace00a7f966a94c2f018dd9f4bab2b90ee76547840"
    },
    "qualification_ids": [
      "sichos-222-position-1-qualification-0",
      "sichos-222-position-1-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-222-position-2",
    "source_index": 3,
    "array_position": 2,
    "fields": {
      "en": "f3d8f44f42f129bc61c24e68b622800b9e148764f4658f8183e9837156accd94",
      "he": "15867536d790d4234121b7b19455fff76fb941574b1c06ce0b668b6e9b7527a5",
      "he_nikud": "ce579d37281f8f94f6a95ae2e852087629c2c61ec80b938cb23c565f1950caf0"
    },
    "qualification_ids": [
      "sichos-222-position-2-qualification-0",
      "sichos-222-position-2-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-222-position-3",
    "source_index": 4,
    "array_position": 3,
    "fields": {
      "en": "ee7ad7f028a7a5e9e611784bad048fb9efb49d297fb1b5c6863bd0ea412ac20a",
      "he": "c13836c74dfe91b33dce44fda82f1dd7cecd164ae7260aaf69a9a4e8ec925ecc",
      "he_nikud": "b3ddaec58b860e1b6f91a7033fcc348440cd86fa4aacaca7b5bb76af112c5094"
    },
    "qualification_ids": [
      "sichos-222-position-3-qualification-0",
      "sichos-222-position-3-qualification-1",
      "sichos-222-position-3-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "54175a3f799aadb23441680e7e1876e9bbf4300aa94965a00a2733717a5a2f94"
    ]
  },
  {
    "owner": "sichos-223-position-0",
    "source_index": 1,
    "array_position": 0,
    "fields": {
      "en": "0eec205981bbf1a1e4d3d60025bddb858690d9c21e6cfbda0594df855e5f8812",
      "he": "64facaeb0e3e8e528eec5546d683e809b7b5a4951bdbdf67ad55029276046990",
      "he_nikud": "a88273ebdec87935abb008da815e76ec45f3509868d1e9a745813d1146dc5671"
    },
    "qualification_ids": [
      "sichos-223-position-0-qualification-0",
      "sichos-223-position-0-qualification-1",
      "sichos-223-position-0-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "cf62a6e5692dd05cd0ce2741398518a308ae8ff9822282b260a198a23dbf1ec6"
    ]
  },
  {
    "owner": "sichos-223-position-1",
    "source_index": 2,
    "array_position": 1,
    "fields": {
      "en": "6a0a408d96c00c81716afd3f3a3f76945be67ee70cdb0d25dd7b6bd4118c396d",
      "he": "2f064358c27b4b1486149572f2a76a44bb2b018d5a4c9ff6bd048e62d33859c3",
      "he_nikud": "90ff398ecb8d42380031e29896dcaf5b09bb26073e540254be506ee91ebf31ee"
    },
    "qualification_ids": [
      "sichos-223-position-1-qualification-0",
      "sichos-223-position-1-qualification-1",
      "sichos-223-position-1-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "8789cc91e62693d01410790bd79e1cfc93a4bc6e54e61c1cd329685ccce33a55"
    ]
  },
  {
    "owner": "sichos-224-position-0",
    "source_index": 1,
    "array_position": 0,
    "fields": {
      "en": "d811ba75458acd324d239ce03414a57c0045cb51bcf8fbb5d5690a3e08252c18",
      "he": "449622165b8c64bd13efd907c461db1bd984d1801f7a371419b45dd75c260f88",
      "he_nikud": "821ad2e307905a7b69c7f4836f82627bb69d9a980019ac81b0396f188cf345e4"
    },
    "qualification_ids": [
      "sichos-224-position-0-qualification-0",
      "sichos-224-position-0-qualification-1",
      "sichos-224-position-0-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "f77ef68105d84d64224a8dab423030e636f0d260426234659bcda80a177606f8"
    ]
  },
  {
    "owner": "sichos-224-position-1",
    "source_index": 2,
    "array_position": 1,
    "fields": {
      "en": "08b5b3241af6c4402789f33ff4aff61394a1d44e16150c895c1dc10878a79038",
      "he": "031fcf9c3014702131223f22fd248e5c1404690518fcb600db324ce37507a3dc",
      "he_nikud": "a4c24222870e115406fe84c6002396bd421b22578e4db6aa99e7626476d04757"
    },
    "qualification_ids": [
      "sichos-224-position-1-qualification-0",
      "sichos-224-position-1-qualification-1",
      "sichos-224-position-1-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "e7ae3923397bdd1e2c1e8155bb0de8c2e9f17c33dcdd968b0ffb629eee501803"
    ]
  },
  {
    "owner": "sichos-224-position-2",
    "source_index": 3,
    "array_position": 2,
    "fields": {
      "en": "c2250a5ac121c08c381146e490a9887575d3a8e7fea52ab8cffd76515e5eb91b",
      "he": "cf8797e421a50f7a4ec9e6594ccefa0af5b21ec3f865acd4d13bf2b375ca8c9e",
      "he_nikud": "f1b7f2b8d26811649f06abc9d1f74a10cae3fe4d62109e5ac8cbff338da114cb"
    },
    "qualification_ids": [
      "sichos-224-position-2-qualification-0",
      "sichos-224-position-2-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-225-position-0",
    "source_index": 1,
    "array_position": 0,
    "fields": {
      "en": "e7a621cad980b6f3b55fbe4f17548b5c337ad28db432cbe12ba3ae9c15dbcc56",
      "he": "63a446fc0068e59dc5cb21c16d78e158567c1b4d77aae29ee632f8ea258be948",
      "he_nikud": "2bd4f8d2b608e42db0ea6efa3ab04545359d1a30404fb616880d3f34784aad05"
    },
    "qualification_ids": [
      "sichos-225-position-0-qualification-0",
      "sichos-225-position-0-qualification-1",
      "sichos-225-position-0-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "cea8d561db6ba89de3ba633ecb3babd6aa5084938662cf0d0b6ce46e52aa45e7"
    ]
  },
  {
    "owner": "sichos-225-position-1",
    "source_index": 2,
    "array_position": 1,
    "fields": {
      "en": "ce87479b1e7eba8cf5f63ebaec950197c4af00f41f83aa3da205c3fe2e36faa8",
      "he": "bb56c38de82ba3bc0fa7b39ce264e782cebd31d9b722a566a90ffdf6d6839325",
      "he_nikud": "285537ea45f4d52b72d6c2550395b05c53eeec211719c7eca34614111fbcf7a3"
    },
    "qualification_ids": [
      "sichos-225-position-1-qualification-0",
      "sichos-225-position-1-qualification-1",
      "sichos-225-position-1-qualification-2"
    ],
    "qualification_text_sha256": [
      "09fc4b99d6c5b33858609f3e56ae1fa46a42d09c314906cdd48248983d018429",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "3edb8e225a3e9873f8d0a9cd93b4f5380b79885a482ddfca0958a5e682062915"
    ]
  },
  {
    "owner": "sichos-225-position-2",
    "source_index": 3,
    "array_position": 2,
    "fields": {
      "en": "95810527b29e8829094f91be89e265d9030257e9f48721c8113d73fbff782e49",
      "he": "a0a408f25931d30c9788a08a5ef0ef80d69f864a1ca6ebf973929c6373543878",
      "he_nikud": "2be68c2ce9d59f1fc860f4bc0c9a865a360f203257e93cdf2183783ef3d99f10"
    },
    "qualification_ids": [
      "sichos-225-position-2-qualification-0",
      "sichos-225-position-2-qualification-1",
      "sichos-225-position-2-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "059334b98d5c067dedd02fff00289a4ce2d7314ac901517608bc8687ce47f1ba"
    ]
  },
  {
    "owner": "sichos-225-position-3",
    "source_index": 4,
    "array_position": 3,
    "fields": {
      "en": "7bf9651733764cdbaa2c945bd34a0dfca7a14255e94af8ae96e8aad6cce77510",
      "he": "aab51f73aae473ce52fd74cdd049ebf0eb12291100f91f7b59ba14c80e92571d",
      "he_nikud": "eb2ed22ad33335878bf2b9c0faf1824cd3abdf2ad4d6d7de936c5df585f6bcbc"
    },
    "qualification_ids": [
      "sichos-225-position-3-qualification-0",
      "sichos-225-position-3-qualification-1",
      "sichos-225-position-3-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "a54671eb57e89a8135911461c282d2b20b43261106eec36c46df5b7ec72f656b"
    ]
  },
  {
    "owner": "sichos-225-position-4",
    "source_index": 5,
    "array_position": 4,
    "fields": {
      "en": "27113cbcb3920347404c09d0dfcf3cb781e9deeba80a37158182c7374de639e7",
      "he": "d76daeed19497b259aa4c4f8df1879eadd483e96329a6037b0b7d86aaf892e1a",
      "he_nikud": "4b498056da233435d2963e34a297a8bf57fff993a6454aa8b78f8fe4a3e67b12"
    },
    "qualification_ids": [
      "sichos-225-position-4-qualification-0",
      "sichos-225-position-4-qualification-1",
      "sichos-225-position-4-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "126c659686c6326d097526854141d5b14f20c83d23106d28e8557e52426f9110"
    ]
  },
  {
    "owner": "sichos-225-position-5",
    "source_index": 6,
    "array_position": 5,
    "fields": {
      "en": "a5f936e0573c1ef4d6b5ed73b844a928e52a1ddb1c8b346311313f3575f401bb",
      "he": "98da92b88bf9cd0eb03fd67568b132170b5a9371369d592c0a9b17b30205448d",
      "he_nikud": "53ed0411c4139510120228fafb8f4886b4cf9df7aa8ba914a1e89eba69abf431"
    },
    "qualification_ids": [
      "sichos-225-position-5-qualification-0",
      "sichos-225-position-5-qualification-1",
      "sichos-225-position-5-qualification-2",
      "sichos-225-position-5-qualification-3"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "7a366e609cc5e69936d0fe6ef9c8a49737535998580cfd563782b2e9b11603b0",
      "baea7caf4054f50c826e47cc1f763576e6d588e6ed3eca87d29a371e0dc8be30"
    ]
  },
  {
    "owner": "sichos-225-position-6",
    "source_index": 7,
    "array_position": 6,
    "fields": {
      "en": "e0cb54c9affc1d466b71c3537c71f49c17a4fcf44242cc4f250405485c5a49bb",
      "he": "ef9dcf008bac97526bb219df4fe4ae0ced183e2ce8157d8b919121bac6059559",
      "he_nikud": "20003561197db4bf998868f9914d656fa2bc6ff0bf6b5593d5adfdc2924a0d05"
    },
    "qualification_ids": [
      "sichos-225-position-6-qualification-0",
      "sichos-225-position-6-qualification-1",
      "sichos-225-position-6-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "b6118ed3c437c7e584bb5ee1d7aa1b542f2555ad4fb04d337e07d52d7a44252d"
    ]
  },
  {
    "owner": "sichos-225-position-7",
    "source_index": 8,
    "array_position": 7,
    "fields": {
      "en": "af63842851c35c47410b0886c80cb112fa0e0beb8bb9384c01936019919b2334",
      "he": "d45b0604f115a412ccb391fd9995f18199b3dbcd821a0a7045c452c30a815948",
      "he_nikud": "4aa330fcccc6990dd3ce7b225bdc9b84e54e088a3c354d931b2864085185bd28"
    },
    "qualification_ids": [
      "sichos-225-position-7-qualification-0",
      "sichos-225-position-7-qualification-1",
      "sichos-225-position-7-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "7f3edcda558eabd422b6f8d7ee3d9be53bdc05a4dd051b79b5e69eb5b21b6404"
    ]
  },
  {
    "owner": "sichos-225-position-8",
    "source_index": 9,
    "array_position": 8,
    "fields": {
      "en": "facb4fd70e0167c64c91c84af84984f62c8072a7883e401a82bd5fb8063a09c9",
      "he": "172272ba057e50cf09d9f16a8ec2ed7ef94412287628ea495c89b25a0285e863",
      "he_nikud": "4d256019b23dc22c905d08020f6398e8f86370a99761d4519339a1ceb0f8e862"
    },
    "qualification_ids": [
      "sichos-225-position-8-qualification-0",
      "sichos-225-position-8-qualification-1",
      "sichos-225-position-8-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "224d71fb3dbd994e6cf53f872c1fe72158e002b3111acb695dec9872a3cc1e20"
    ]
  },
  {
    "owner": "sichos-225-position-9",
    "source_index": 10,
    "array_position": 9,
    "fields": {
      "en": "137c0aa8b84eab8db24b2dd137587352ecc686c4b87687a467db1715f6c50cd3",
      "he": "7774fbec465ba6fc9d5be06b7d2f0f7d7c6f93e4de9fecad7ed4b5e1e362e338",
      "he_nikud": "ef89fea0315519811909e7050130d4529962071c803ae97ad43a44f2e14ee8f6"
    },
    "qualification_ids": [
      "sichos-225-position-9-qualification-0",
      "sichos-225-position-9-qualification-1",
      "sichos-225-position-9-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "59d76c71cce4da3a527f53f02b6f836ddbe7c5e4a223ef512aaf3f048ed0ed1d"
    ]
  },
  {
    "owner": "sichos-225-position-10",
    "source_index": 11,
    "array_position": 10,
    "fields": {
      "en": "521892898b41481d867676f8a0c905d2387a73e3311505cf548d4a9013974712",
      "he": "af5de28181a20808943e5cd057e38f0050fa03969485943aad0cf6817c9063cf",
      "he_nikud": "26097bccf8b64db7c0aa8616f2a7c15bf60c6c218eb8bc0ae63142e14ba62e9a"
    },
    "qualification_ids": [
      "sichos-225-position-10-qualification-0",
      "sichos-225-position-10-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-225-position-11",
    "source_index": 12,
    "array_position": 11,
    "fields": {
      "en": "e89d632f337fd183565c8cb12c41752f5517ad7978554c7a7400d16c769a5ca4",
      "he": "bbbe0fd1bb38105201fac6d4abad2dcc0d0e224ac839e4e1b6bba9aff798c9ce",
      "he_nikud": "fcb6cdd5c62f8ca5c4a62af58235169fcf16b1c82fd91a90df250675bba1cbbf"
    },
    "qualification_ids": [
      "sichos-225-position-11-qualification-0",
      "sichos-225-position-11-qualification-1",
      "sichos-225-position-11-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "416ab8fd2894b8a0cf124acaf2d1503865c88f028af6c7f9f82d59dba3564891"
    ]
  },
  {
    "owner": "sichos-225-position-12",
    "source_index": 13,
    "array_position": 12,
    "fields": {
      "en": "c9163204b9a0cef7735a6443a0f709ca96eb3711073a2909eedd47776ebe9ca5",
      "he": "3198672849f82e31b29ed3e29afdbfe800f55f2ee9e0034d63c64935fe185774",
      "he_nikud": "c80bb46ba225b4c29227419225dc7796dd9ceaf6aaad2200be23fc5dc23af4a6"
    },
    "qualification_ids": [
      "sichos-225-position-12-qualification-0",
      "sichos-225-position-12-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-225-position-13",
    "source_index": 14,
    "array_position": 13,
    "fields": {
      "en": "3245f4ac757b154d93b102175af09a349d5148e28a628aa8896a8f2c8c2b76b8",
      "he": "8520004293545dc4d64110942e0d54641ef4c51c208d2a5a7ab2fee98dcc1177",
      "he_nikud": "d2f134dde6d048fa03861162c3d021cd26b6004ea5d2639337b8991890f3e261"
    },
    "qualification_ids": [
      "sichos-225-position-13-qualification-0",
      "sichos-225-position-13-qualification-1",
      "sichos-225-position-13-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "3812603521dcb80751af48c5f560798a987e10a4be5d969bf94cc8fce62b1346"
    ]
  },
  {
    "owner": "sichos-226-position-0",
    "source_index": 1,
    "array_position": 0,
    "fields": {
      "en": "7a7df72e8bb634144fc7f61befd4d983ae992f8fef62d23a73ec3c1d0bc5e544",
      "he": "7438559101eda84adef6bbaf3715c00d085a6555507122f6573044786c627958",
      "he_nikud": "ea2ae30149fff6ad37964218f93649c47348dbefcddc6dc0155d89d4216643e4"
    },
    "qualification_ids": [
      "sichos-226-position-0-qualification-0",
      "sichos-226-position-0-qualification-1",
      "sichos-226-position-0-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "403e755210c43fc94e6c67dedb214e30e16a105cac0446311ea94c76f5b3e7f5"
    ]
  },
  {
    "owner": "sichos-227-position-0",
    "source_index": 1,
    "array_position": 0,
    "fields": {
      "en": "37254817cbddb8c9c6a03cd23ddd4955024e68633308696a3b8eb03d8b5a2051",
      "he": "a0fffc1359399c235318cdd083f86ea3434f833d5f63e2f51c411aea7ce08c16",
      "he_nikud": "b5fa04124240ac3dd25e545738b66801ca1b2ac3d419f76497c1d9630b1380b9"
    },
    "qualification_ids": [
      "sichos-227-position-0-qualification-0",
      "sichos-227-position-0-qualification-1",
      "sichos-227-position-0-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "5fadeee20cdbc5771d75d92c9ed438b640b3be44ed3c0a279abc2f356eee75a6"
    ]
  },
  {
    "owner": "sichos-228-position-0",
    "source_index": 1,
    "array_position": 0,
    "fields": {
      "en": "28cf522450545f638471340405bc88aa61336d2809524efc4e65faaad7d76aee",
      "he": "494eaf36079e3821a88e1b1ef81016a510506ab8b2517fedb1bf654710d34a45",
      "he_nikud": "0295bfadd1256905ce2f23fb1c577e1f68a605558a205eff983bd083be159bbf"
    },
    "qualification_ids": [
      "sichos-228-position-0-qualification-0",
      "sichos-228-position-0-qualification-1",
      "sichos-228-position-0-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "b992c826daa331b2b67c9cf333b0036adb377afe40ffc6f36db9f76c683050ec"
    ]
  },
  {
    "owner": "sichos-228-position-1",
    "source_index": 2,
    "array_position": 1,
    "fields": {
      "en": "14719d00f8b4ea77523602fd268d16c1041aaed6acdb722008cbc0e5853cb675",
      "he": "0cce1381288ea19c8844d220d0b92147cf94ca05d9f9e2d00f9c3e2373389deb",
      "he_nikud": "405d8d398e71c77c71f8197e3caa061e500aae5f96b3b2b7ae34a25433021191"
    },
    "qualification_ids": [
      "sichos-228-position-1-qualification-0",
      "sichos-228-position-1-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-229-position-0",
    "source_index": 1,
    "array_position": 0,
    "fields": {
      "en": "1c4778b18289e6de9dc53060a7f146584f65ecd7c04590f45561407a32cac91f",
      "he": "41f0bbd7de877c69f9562230676491ee84a631f37a2cec48c34eb145448406a0",
      "he_nikud": "a0e9491f6cc59729e25037bcb782944967b73000c7886a56ff83cd4585449b30"
    },
    "qualification_ids": [
      "sichos-229-position-0-qualification-0",
      "sichos-229-position-0-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-229-position-1",
    "source_index": 2,
    "array_position": 1,
    "fields": {
      "en": "e64a308790856c5156e979f8a7281e5f6eb5a00f16202cab00561d79e91b59bd",
      "he": "71177593723d0818b5a7147882f8c415e0025ce57ef037c2da31955afdbc281d",
      "he_nikud": "78de5691e88e7400816360bba7dd01780cd3b38dbf9c15ab1789da1406005b5d"
    },
    "qualification_ids": [
      "sichos-229-position-1-qualification-0",
      "sichos-229-position-1-qualification-1",
      "sichos-229-position-1-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "31f2cd6e67c7175337a37b6af8849a237982f68b91bde7ef321e66b49c0f6384"
    ]
  },
  {
    "owner": "sichos-229-position-2",
    "source_index": 3,
    "array_position": 2,
    "fields": {
      "en": "0aaa98ebed3675b5f3758c91b252a4ab12f00ae5c54c2222200af2463414acf5",
      "he": "fa99b77547aa920e78e10741ba8f24a023285abe095a27b614a2710057d62894",
      "he_nikud": "efcb1a6d146274df09af3f19b927e23a23764c73b4a8cd31d9498f7ab578a2c0"
    },
    "qualification_ids": [
      "sichos-229-position-2-qualification-0",
      "sichos-229-position-2-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-229-position-3",
    "source_index": 4,
    "array_position": 3,
    "fields": {
      "en": "8292342052809a98b19fdd0e359096a09f2d816d8f9e3b070b4ddebb8382a71a",
      "he": "4fd9fdd16d990e6e1ee5f4efd4c5c6edad46e69a4d2df7df0421771e931b5e2a",
      "he_nikud": "89a2441c37ca5619e9c658b364cc3c0a80de6217da9698832f035b24cbf04f64"
    },
    "qualification_ids": [
      "sichos-229-position-3-qualification-0",
      "sichos-229-position-3-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-229-position-4",
    "source_index": 5,
    "array_position": 4,
    "fields": {
      "en": "3a9db4ffe1348b074cecabe7498ef7bc5673ace8e0dbfcb9a66a2b2ea35d5aa2",
      "he": "6dcd8d2dfbe25d6c1317b411abc065c6e16255a5e5c68a469bb4f1bcfd766c30",
      "he_nikud": "aacdf46d2fae39d04b0b892b7d2d09e5121b6f3bca866107ab0eb67a3fae6806"
    },
    "qualification_ids": [
      "sichos-229-position-4-qualification-0",
      "sichos-229-position-4-qualification-1",
      "sichos-229-position-4-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "f8b0ee7f779b5e597d86c57366c3561c3431648a8f734e91f64235a2af70b148"
    ]
  },
  {
    "owner": "sichos-230-position-0",
    "source_index": 1,
    "array_position": 0,
    "fields": {
      "en": "44be76717723092c825b84b7ed032e2f9cfb5c76e87e411b039dc1c16b766f67",
      "he": "18068df1864c0131eb775cc3be0063c391fc61170294e599435ac562f20ebb66",
      "he_nikud": "4401bb662b20e93f70c66b99695d201a14e67c77a90825b0099851d679fa9aed"
    },
    "qualification_ids": [
      "sichos-230-position-0-qualification-0",
      "sichos-230-position-0-qualification-1",
      "sichos-230-position-0-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "030dafffde10b6b667ae3ce84136d86ed41ee9520371c7d4c46b5c67e7c66d00"
    ]
  },
  {
    "owner": "sichos-230-position-1",
    "source_index": 2,
    "array_position": 1,
    "fields": {
      "en": "df6d1e85d220fa9f926eb424a9dbed4d93bbafd645c9aee5e3482d5d3d345ba5",
      "he": "7414919792d61360d004faa20b52cd54dabaa353d286d08314994e21800d8362",
      "he_nikud": "e0c7d0f673646e387532498d69fb275466b6c0605ee71069c8e0193466e3ffcc"
    },
    "qualification_ids": [
      "sichos-230-position-1-qualification-0",
      "sichos-230-position-1-qualification-1"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c"
    ]
  },
  {
    "owner": "sichos-230-position-2",
    "source_index": 3,
    "array_position": 2,
    "fields": {
      "en": "54f0d7971d7267ec83e8756a1b36e6c9ee03287be4ecc4e9d6d4fae0165265f8",
      "he": "afff64b45f167f501917322401a0f1582e7a3884de43e72fe6cf7494aba72f7b",
      "he_nikud": "e5171b2d92a65814a2b969534b348d21c87fa20c12189f4fc6951bbedc81286a"
    },
    "qualification_ids": [
      "sichos-230-position-2-qualification-0",
      "sichos-230-position-2-qualification-1",
      "sichos-230-position-2-qualification-2"
    ],
    "qualification_text_sha256": [
      "abf4de5c8c62e267652a7fa789a6292e44079d9220c14a5453f4ea64dd957ce5",
      "b5acef6800017c8c41c47ad873131aecb5d18ed61e613c729229c2f0c3bb510c",
      "48e40e37b76fd4ddf75d891567e2d067301af0142b8048cc256c2d39fcdbf03d"
    ]
  }
];

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const data=await loadEdition(ROOT),ids=data.units.map(u=>u.owner),raw=fs.readFileSync(path.join(ROOT,'public',ASSET));
const loaded=Object.fromEntries(data.assets.map(a=>[a.name,JSON.parse(fs.readFileSync(path.join(ROOT,'public',a.url)))]));
assert.equal(sha(raw),PIN);assert.deepEqual(ids,EXPECTED.map(r=>r.owner));assert.equal(data.units.length,38);
assert(!ids.includes('sichos-221-position-2'));
assert.deepEqual(ORDER,data.units.map(u=>[u.section,u.array_position,u.source_index]));
assert.equal(data.units.flatMap(u=>u.qualifications).length,102);
assert.equal(data.canonical_replacement,false);assert.equal(data.source_approval,false);
for(const [i,u] of data.units.entries()){
 const want=EXPECTED[i];assert.equal(u.source_index,want.source_index);assert.equal(u.array_position,want.array_position);
 for(const f of ['he','he_nikud','en'])assert.equal(sha(Buffer.from(u[f])),want.fields[f]);
 assert.deepEqual(u.qualifications.map(q=>q.id),want.qualification_ids);assert.deepEqual(u.qualifications.map(q=>sha(Buffer.from(q.text))),want.qualification_text_sha256);
 const current=JSON.parse(fs.readFileSync(path.join(ROOT,'public/reader/sichos-haran/sicha-'+u.section+'.json'))).segments[u.array_position];
 assert.equal(current.index,u.source_index);for(const f of ['he','he_nikud'])assert.equal(current[f],u[f]);
}
const historical=data.units.find(u=>u.owner==='sichos-225-position-1');
assert.equal(historical.en,historical.displacedEnglish);
assert(historical.qualifications[0].text.includes('retained verbatim'));
assert.equal(data.units.filter(u=>u.qualifications[0].text.includes('editorial translation from the supplied Hebrew')).length,37);
function full(text,units=data.units){
 for(const u of units){for(const f of ['he','he_nikud','en'])assert(text.includes(u[f]));for(const q of u.qualifications)assert(text.includes(q.text));}
 const counts=new Map();for(const u of units)for(const q of u.qualifications)counts.set(q.text,(counts.get(q.text)||0)+1);
 for(const [textNote,count] of counts)assert.equal(text.split('Source note\n'+textNote).length-1,count);
 assert(!/private candidate|parent English|pending focused|current_ordered_Q|array position/.test(text));
}
const whole=fullBodyPayload(data,ids);assert.equal(whole.requiredQualifications.length,102);assert.deepEqual(whole.requiredQualifications,data.units.flatMap(u=>u.qualifications));full(whole.content);
for(const u of data.units){const p=fullBodyPayload(data,[u.owner]);assert.equal(p.requiredQualifications.length,u.qualifications.length);full(p.content,[u]);}
const mutations=[
 ['missing-owner',d=>d.units.pop()],['owner-order',d=>d.units.reverse()],
 ['en',d=>d.units[0].en+='x'],['he',d=>d.units[0].he+='x'],['pointed',d=>d.units[0].he_nikud+='x'],
 ['missing-note',d=>d.units[0].qualifications.pop()],['note-order',d=>d.units[0].qualifications.reverse()],
 ['note-text',d=>d.units[0].qualifications[0].text+='x'],['note-owner',d=>d.units[0].qualifications[0].owner=ids[1]],
 ['note-body-binding',d=>d.units[0].qualifications[0].current_en_sha256='0'.repeat(64)],
 ['array-position',d=>d.units[1].array_position=999],['source-index',d=>d.units[4].source_index=999],
 ['historical-English',d=>d.units[0].displacedEnglish+='x'],['source-approval',d=>d.source_approval=true],
 ['canonical-claim',d=>d.canonical_replacement=true],['source-inventory',d=>d.assets.pop()],['group-inventory',d=>d.groups.pop()],
 ['mandatory',d=>d.units[0].qualifications[0].mandatory=false],['placement',d=>d.units[0].qualifications[0].placement='before-pair'],
 ['duplicate-note',d=>d.units[0].qualifications.push(structuredClone(d.units[0].qualifications[0]))]
];
for(const [name,mutate] of mutations){const d=structuredClone(data);mutate(d);assert.throws(()=>validateProjection(d,loaded),undefined,name);validateProjection(data,loaded);}
for(const invalid of [[],[ids[0],ids[0]],['unknown'],[ids.at(-1),ids[0]]])assert.throws(()=>fullBodyPayload(data,invalid));
assert.throws(()=>fullBodyPayload(structuredClone(data),[ids[0]]));
const digest=b=>sha(b);await assert.rejects(authenticateEdition(Buffer.concat([raw,Buffer.from(' ')]),()=>{},digest));
for(const asset of data.assets)await assert.rejects(authenticateEdition(raw,a=>a.name===asset.name?Buffer.from('{}'):fs.readFileSync(path.join(ROOT,'public',a.url)),digest));
assert.deepEqual(getStaticPaths().map(p=>p.params.format),['index.txt','index.md','index.json']);
for(const format of ['txt','md','json']){const res=await GET({params:{format:'index.'+format}});assert.equal(res.status,200);assert.equal(res.headers.get('X-Robots-Tag'),'noindex, nofollow');const text=await res.text();if(format==='json'){const body=JSON.parse(text);full(body.content);assert.deepEqual(body.requiredQualifications,whole.requiredQualifications);assert.deepEqual(body.sourceUnits,data.units);}else full(text);}
assert.equal((await GET({params:{format:'english-only.txt'}})).status,404);assert.throws(()=>plainExport(data,'english-only'));
const html=plainExport(data,'html');assert.equal((html.match(/data-qualification=/g)||[]).length,102);assert.equal((html.match(/data-source-field=/g)||[]).length,114);assert(!/<details/.test(html));
const template=fs.readFileSync(path.join(ROOT,'src/pages/reader/reviewed/sichos-221-230.astro'),'utf8');assert(template.includes('data-qualified-sichos-221230'));assert(template.includes('data-qualification={q.id}'));assert(!template.includes('/reader-script.js'));assert(!template.includes('/reader-v2.js'));
for(const p of ['src/pages/reader/reviewed/index.astro','src/pages/reader/sichos-haran/[part]/index.astro','src/pages/reader/sichos-haran/[part]/[torah].astro']){const t=fs.readFileSync(path.join(ROOT,p),'utf8');assert(t.includes('/reader/reviewed/sichos-221-230/'));assert(t.includes('/reader/reviewed/sichos-224-225-229-230/'));}
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json')));assert.equal(pkg.scripts['verify:sichos-221230'],'node --max-old-space-size=128 scripts/verify-sichos-221230.mjs');assert(pkg.scripts.verify.endsWith(' && npm run verify:sichos-221230'));
const script="import sys,pathlib;sys.path.insert(0,'scripts');from reader_search_routes import route_for_source;root=pathlib.Path('public/reader');paths=[root/'reviewed/sichos-221-230.json',*sorted((root/'reviewed/sichos-221230-sources').glob('*.json'))];assert len(paths)==12;assert all(route_for_source(p,root) is None for p in paths);print('12/12 qualified sources excluded')";
assert.equal(execFileSync('python3',['-B','-c',script],{cwd:ROOT,encoding:'utf8'}).trim(),'12/12 qualified sources excluded');
// The ordinary plain traversal shares this exact pre-ingestion boundary.
const plainPolicy="import sys,pathlib,json,importlib.util;sys.path.insert(0,'scripts');spec=importlib.util.spec_from_file_location('plain','scripts/build-reader-plain-text.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);root=pathlib.Path('public/reader').resolve();archives=sorted((root/'reviewed/sichos-221230-sources').glob('sicha-*-original.json'));assert len(archives)==10;assert all(m.is_sichos221230_archive(p,root) for p in archives);assert not any(m.is_sichos221230_archive(root/p,root) for p in ['reviewed/sichos-221230-sources-extra/a.json','reviewed/sichos-221230-sources.json','reviewed/other/a.json']);canonical=[root/f'sichos-haran/sicha-{n}.json' for n in range(221,231)];assert all(not m.is_sichos221230_archive(p,root) for p in canonical);ids=[m.infer_ids(p,json.loads(p.read_bytes())) for p in canonical];assert len(set(ids))==10;assert all(m.collect_segments(json.loads(p.read_bytes())) for p in canonical);print('10 archives excluded; 10 unique canonical inputs eligible')";
assert.equal(execFileSync('python3',['-B','-c',plainPolicy],{cwd:ROOT,encoding:'utf8'}).trim(),'10 archives excluded; 10 unique canonical inputs eligible');
console.log(JSON.stringify({status:'PASS',scope:'canonical data/source/qualification/export/discovery/search policy; not native or full init',paragraphs:38,qualifications:102,logical_mutation_rejections:mutations.length,fresh_logical_positives:mutations.length,authenticated_bound_assets:data.assets.length,source_fields:114}));
